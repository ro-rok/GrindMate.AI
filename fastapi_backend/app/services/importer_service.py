"""
Importer Service

Orchestrates import preview and commit operations for GraphQL dumps.
Handles parsing, normalization, validation, and database upserts.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from dataclasses import dataclass
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from .sanitizer_service import SanitizerService, get_sanitizer_service
from .parser_service import ParserService, get_parser_service
from .normalizer_service import NormalizerService, NormalizedQuestion, get_normalizer_service


@dataclass
class PreviewResponse:
    """Response for import preview"""
    counts: Dict[str, int]  # {total, valid, invalid, would_create, would_update, would_skip}
    duplicates: List[str]  # titleSlugs
    sample: List[Dict[str, Any]]  # First 10 normalized questions
    errors: List[Dict[str, Any]]  # Validation errors


@dataclass
class CommitResponse:
    """Response for import commit"""
    counts: Dict[str, int]  # {total, created, updated, skipped, invalid}
    import_id: str  # Import batch _id
    errors: List[Dict[str, Any]]  # Validation errors


@dataclass
class UpsertCounts:
    """Counts from upsert operation"""
    created: int
    updated: int
    skipped: int


class ImporterService:
    """Service for orchestrating import operations"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        """
        Initialize importer service.
        
        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.sanitizer = get_sanitizer_service()
        self.parser = get_parser_service()
        self.normalizer = get_normalizer_service()
    
    async def preview_import(
        self,
        raw_input: str,
        list_name: str,
        source: str
    ) -> PreviewResponse:
        """
        Preview import without database changes.
        
        Args:
            raw_input: Raw GraphQL dump text
            list_name: Name of the list being imported
            source: Source identifier (e.g., "leetcode_favorites")
            
        Returns:
            PreviewResponse with counts, sample, duplicates, and errors
            
        Raises:
            ValueError: If parsing fails
        """
        # Parse the input
        parse_result = self.parser.parse(raw_input)
        
        if not parse_result.success:
            raise ValueError(
                f"{parse_result.error}. {parse_result.hint or ''}"
            )
        
        # Normalize the questions
        normalization_result = self.normalizer.normalize_batch(parse_result.questions)
        
        # Check which questions exist in database
        existing_map = await self._check_existing(normalization_result.valid)
        
        # Calculate counts
        would_create = 0
        would_update = 0
        would_skip = 0
        
        for question in normalization_result.valid:
            if question.titleSlug in existing_map:
                # Question exists - check if it would be updated
                # For preview, we'll assume all existing questions would be updated
                # In reality, we'd need to compare fields to determine if update is needed
                would_update += 1
            else:
                would_create += 1
        
        counts = {
            'total': len(parse_result.questions),
            'valid': len(normalization_result.valid),
            'invalid': len(normalization_result.invalid),
            'would_create': would_create,
            'would_update': would_update,
            'would_skip': would_skip
        }
        
        # Prepare sample (first 10 questions)
        sample = []
        for q in normalization_result.valid[:10]:
            sample.append({
                'title': q.title,
                'titleSlug': q.titleSlug,
                'difficulty': q.difficulty,
                'questionFrontendId': q.questionFrontendId,
                'paidOnly': q.paidOnly,
                'status': q.status,
                'topics': q.topics,
                'acRate': q.acRate,
                'frequency': q.frequency,
                'link': q.link
            })
        
        # Prepare errors
        errors = []
        for invalid in normalization_result.invalid:
            error_entry = {
                'error': invalid['error']
            }
            # Try to get title from raw data
            if 'raw' in invalid and isinstance(invalid['raw'], dict):
                title = invalid['raw'].get('title', 'Unknown')
                error_entry['title'] = title
            errors.append(error_entry)
        
        return PreviewResponse(
            counts=counts,
            duplicates=normalization_result.duplicates,
            sample=sample,
            errors=errors
        )
    
    async def commit_import(
        self,
        raw_input: str,
        list_name: str,
        source: str,
        actor_user_id: str,
        actor_email: str
    ) -> CommitResponse:
        """
        Commit import with database upserts and batch tracking.
        
        Args:
            raw_input: Raw GraphQL dump text
            list_name: Name of the list being imported
            source: Source identifier (e.g., "leetcode_favorites")
            actor_user_id: User ID performing the import
            actor_email: Email of user performing the import
            
        Returns:
            CommitResponse with counts, import_id, and errors
            
        Raises:
            ValueError: If parsing fails
        """
        # Parse the input
        parse_result = self.parser.parse(raw_input)
        
        if not parse_result.success:
            raise ValueError(
                f"{parse_result.error}. {parse_result.hint or ''}"
            )
        
        # Normalize the questions
        normalization_result = self.normalizer.normalize_batch(parse_result.questions)
        
        # Upsert questions into database
        upsert_counts, question_ids = await self._upsert_questions(normalization_result.valid)
        
        # Compute payload hash
        normalized_dicts = [self._question_to_dict(q) for q in normalization_result.valid]
        payload_hash = self.sanitizer.compute_payload_hash(normalized_dicts)
        
        # Prepare counts
        counts = {
            'total': len(parse_result.questions),
            'created': upsert_counts.created,
            'updated': upsert_counts.updated,
            'skipped': upsert_counts.skipped,
            'invalid': len(normalization_result.invalid)
        }
        
        # Create import batch record
        import_id = await self._create_import_batch(
            list_name=list_name,
            source=source,
            actor_user_id=actor_user_id,
            actor_email=actor_email,
            payload_hash=payload_hash,
            counts=counts,
            question_ids=question_ids,
            errors=normalization_result.invalid
        )
        
        # Prepare errors
        errors = []
        for invalid in normalization_result.invalid:
            error_entry = {
                'error': invalid['error']
            }
            # Try to get title from raw data
            if 'raw' in invalid and isinstance(invalid['raw'], dict):
                title = invalid['raw'].get('title', 'Unknown')
                error_entry['title'] = title
            errors.append(error_entry)
        
        return CommitResponse(
            counts=counts,
            import_id=str(import_id),
            errors=errors
        )
    
    async def _check_existing(
        self,
        questions: List[NormalizedQuestion]
    ) -> Dict[str, str]:
        """
        Check which questions exist in database (by source + titleSlug).
        
        Args:
            questions: List of normalized questions
            
        Returns:
            Map of titleSlug -> _id for existing questions
        """
        if not questions:
            return {}
        
        # Extract titleSlugs
        title_slugs = [q.titleSlug for q in questions]
        
        # Query database for existing questions with matching source and titleSlug
        cursor = self.db.questions.find(
            {
                'source': 'leetcode_graphql',
                'titleSlug': {'$in': title_slugs}
            },
            {'_id': 1, 'titleSlug': 1}
        )
        
        # Build map
        existing_map = {}
        async for doc in cursor:
            existing_map[doc['titleSlug']] = str(doc['_id'])
        
        return existing_map
    
    async def _upsert_questions(
        self,
        questions: List[NormalizedQuestion]
    ) -> tuple[UpsertCounts, List[ObjectId]]:
        """
        Upsert questions into database.
        
        Args:
            questions: List of normalized questions to upsert
            
        Returns:
            Tuple of (UpsertCounts, list of question ObjectIds)
        """
        created = 0
        updated = 0
        skipped = 0
        question_ids = []
        
        current_time = datetime.utcnow()
        
        for question in questions:
            # Generate titleSlug if not present (for CSV imports or missing data)
            title_slug = question.titleSlug
            if not title_slug or not title_slug.strip():
                if question.title:
                    import re
                    # Remove special characters and convert to lowercase
                    slug = re.sub(r'[^\w\s-]', '', question.title.lower())
                    # Replace spaces with hyphens
                    title_slug = re.sub(r'[-\s]+', '-', slug).strip('-')
                else:
                    # Fallback: generate from link if available
                    if question.link:
                        title_slug = question.link.rstrip('/').split('/')[-1]
                    else:
                        # Last resort: use questionFrontendId
                        title_slug = f"question-{question.questionFrontendId}"
            
            # Ensure titleSlug is set
            if not title_slug:
                title_slug = f"question-{question.questionFrontendId}"
            
            # Prepare question document
            question_doc = {
                'title': question.title,
                'titleSlug': title_slug,
                'difficulty': question.difficulty,
                'questionFrontendId': question.questionFrontendId,
                'link': question.link,
                'source': question.source,
                'paidOnly': question.paidOnly,
                'status': question.status,
                'topics': question.topics,
                'acceptance_rate': question.acRate,
                'frequency': question.frequency,
                'updated_at': current_time
            }
            
            # Check if question exists (use generated title_slug, not question.titleSlug)
            existing = await self.db.questions.find_one(
                {
                    'source': question.source,
                    'titleSlug': title_slug
                }
            )
            
            if existing:
                # Question exists - check if update is needed
                needs_update = False
                
                # Compare mutable fields
                mutable_fields = [
                    'difficulty', 'frequency', 'acceptance_rate', 
                    'topics', 'paidOnly', 'status', 'title', 'link'
                ]
                
                for field in mutable_fields:
                    existing_value = existing.get(field)
                    new_value = question_doc.get(field)
                    
                    # Handle special case for topics (list comparison)
                    if field == 'topics':
                        if existing_value != new_value:
                            needs_update = True
                            break
                    else:
                        if existing_value != new_value:
                            needs_update = True
                            break
                
                if needs_update:
                    # Update existing question (preserve created_at, company_id, timeframe)
                    update_doc = {
                        '$set': {
                            'title': question.title,
                            'titleSlug': title_slug,  # Ensure slug is updated
                            'difficulty': question.difficulty,
                            'frequency': question.frequency,
                            'acceptance_rate': question.acRate,
                            'topics': question.topics,
                            'paidOnly': question.paidOnly,
                            'status': question.status,
                            'link': question.link,
                            'updated_at': current_time
                        }
                    }
                    
                    await self.db.questions.update_one(
                        {'_id': existing['_id']},
                        update_doc
                    )
                    
                    updated += 1
                    question_ids.append(existing['_id'])
                else:
                    # No changes needed
                    skipped += 1
            else:
                # Insert new question
                question_doc['created_at'] = current_time
                
                result = await self.db.questions.insert_one(question_doc)
                created += 1
                question_ids.append(result.inserted_id)
        
        return UpsertCounts(created=created, updated=updated, skipped=skipped), question_ids
    
    async def _create_import_batch(
        self,
        list_name: str,
        source: str,
        actor_user_id: str,
        actor_email: str,
        payload_hash: str,
        counts: Dict[str, int],
        question_ids: List[ObjectId],
        errors: List[Dict[str, Any]]
    ) -> ObjectId:
        """
        Create import batch record in imports collection.
        
        Args:
            list_name: Name of the list being imported
            source: Source identifier
            actor_user_id: User ID performing the import
            actor_email: Email of user performing the import
            payload_hash: SHA-256 hash of sanitized payload
            counts: Import counts
            question_ids: List of question ObjectIds created/updated
            errors: List of validation errors
            
        Returns:
            Import batch _id
        """
        import_doc = {
            'type': 'leetcode_graphql',
            'list_name': list_name,
            'source': source,
            'created_at': datetime.utcnow(),
            'actor': actor_user_id,
            'actor_email': actor_email,
            'payload_hash': payload_hash,
            'counts': counts,
            'question_refs': question_ids,
            'notes': None,
            'errors': errors
        }
        
        result = await self.db.imports.insert_one(import_doc)
        return result.inserted_id
    
    def _question_to_dict(self, question: NormalizedQuestion) -> Dict[str, Any]:
        """
        Convert NormalizedQuestion to dictionary for hashing.
        
        Args:
            question: Normalized question
            
        Returns:
            Dictionary representation
        """
        return {
            'title': question.title,
            'titleSlug': question.titleSlug,
            'difficulty': question.difficulty,
            'questionFrontendId': question.questionFrontendId,
            'link': question.link,
            'paidOnly': question.paidOnly,
            'status': question.status,
            'topics': question.topics,
            'acRate': question.acRate,
            'frequency': question.frequency,
            'source': question.source
        }
    
    async def preview_company_import(
        self,
        raw_input: str,
        company_id: str,
        timeframe: str,
        exclude_solved: bool = False
    ) -> PreviewResponse:
        """
        Preview company-specific import without database changes.
        
        Similar to populate button but uses GraphQL data instead of CSV.
        Includes ALL questions by default (SOLVED, TO_DO, ATTEMPTED).
        Set exclude_solved=True to filter out SOLVED questions.
        
        Args:
            raw_input: Raw GraphQL dump text
            company_id: Company ID to associate questions with
            timeframe: Timeframe (30_days, 60_days, etc.)
            exclude_solved: Whether to exclude SOLVED questions (default: False)
            
        Returns:
            PreviewResponse with counts, sample, duplicates, and errors
            
        Raises:
            ValueError: If parsing fails
        """
        # Parse the input
        parse_result = self.parser.parse(raw_input)
        
        if not parse_result.success:
            raise ValueError(
                f"{parse_result.error}. {parse_result.hint or ''}"
            )
        
        # Filter out SOLVED questions if requested
        questions = parse_result.questions
        if exclude_solved:
            questions = [q for q in questions if q.get('status') != 'SOLVED']
        
        # Normalize the questions
        normalization_result = self.normalizer.normalize_batch(questions)
        
        # Check which questions exist in database for this company and timeframe
        company_obj_id = ObjectId(company_id)
        existing_map = await self._check_existing_company_questions(
            normalization_result.valid,
            company_obj_id,
            timeframe
        )
        
        # Calculate counts
        would_create = 0
        would_update = 0
        would_skip = 0
        
        for question in normalization_result.valid:
            key = f"{question.link}_{timeframe}"
            if key in existing_map:
                would_update += 1
            else:
                would_create += 1
        
        counts = {
            'total': len(parse_result.questions),
            'valid': len(normalization_result.valid),
            'invalid': len(normalization_result.invalid),
            'would_create': would_create,
            'would_update': would_update,
            'would_skip': would_skip,
            'filtered_solved': len(parse_result.questions) - len(questions) if exclude_solved else 0
        }
        
        # Prepare sample (first 10 questions)
        sample = []
        for q in normalization_result.valid[:10]:
            # Convert topics array to comma-separated string like CSV import
            topics_str = ', '.join([t.get('name', '') for t in q.topics]) if q.topics else ''
            
            sample.append({
                'title': q.title,
                'titleSlug': q.titleSlug,
                'difficulty': q.difficulty,
                'link': q.link,
                'topics': topics_str,
                'frequency': q.frequency,
                'acRate': q.acRate
            })
        
        # Collect duplicates (questions appearing multiple times in input)
        duplicates = normalization_result.duplicates
        
        # Prepare errors
        errors = [
            {
                'title': err.get('title', 'Unknown'),
                'error': err.get('error', 'Validation failed')
            }
            for err in normalization_result.invalid
        ]
        
        return PreviewResponse(
            counts=counts,
            duplicates=duplicates,
            sample=sample,
            errors=errors
        )
    
    async def commit_company_import(
        self,
        raw_input: str,
        company_id: str,
        timeframe: str,
        exclude_solved: bool,
        actor_user_id: str,
        actor_email: str
    ) -> CommitResponse:
        """
        Commit company-specific import with database upserts.
        
        Similar to populate button but uses GraphQL data instead of CSV.
        Includes ALL questions by default (SOLVED, TO_DO, ATTEMPTED).
        Set exclude_solved=True to filter out SOLVED questions.
        
        Args:
            raw_input: Raw GraphQL dump text
            company_id: Company ID to associate questions with
            timeframe: Timeframe (30_days, 60_days, etc.)
            exclude_solved: Whether to exclude SOLVED questions (default: False)
            actor_user_id: User ID performing the import
            actor_email: Email of user performing the import
            
        Returns:
            CommitResponse with counts, import_id, and errors
            
        Raises:
            ValueError: If parsing fails
        """
        # Parse the input
        parse_result = self.parser.parse(raw_input)
        
        if not parse_result.success:
            raise ValueError(
                f"{parse_result.error}. {parse_result.hint or ''}"
            )
        
        # Filter out SOLVED questions if requested
        questions = parse_result.questions
        if exclude_solved:
            questions = [q for q in questions if q.get('status') != 'SOLVED']
        
        # Normalize the questions
        normalization_result = self.normalizer.normalize_batch(questions)
        
        # Upsert questions into database with company context
        company_obj_id = ObjectId(company_id)
        upsert_counts, question_ids = await self._upsert_company_questions(
            normalization_result.valid,
            company_obj_id,
            timeframe
        )
        
        # Compute payload hash
        normalized_dicts = [self._question_to_dict(q) for q in normalization_result.valid]
        payload_hash = self.sanitizer.compute_payload_hash(normalized_dicts)
        
        # Prepare counts
        counts = {
            'total': len(parse_result.questions),
            'created': upsert_counts.created,
            'updated': upsert_counts.updated,
            'skipped': upsert_counts.skipped,
            'invalid': len(normalization_result.invalid),
            'filtered_solved': len(parse_result.questions) - len(questions) if exclude_solved else 0
        }
        
        # Prepare errors
        errors = [
            {
                'title': err.get('title', 'Unknown'),
                'error': err.get('error', 'Validation failed')
            }
            for err in normalization_result.invalid
        ]
        
        # Create import batch record
        import_id = await self._create_company_import_batch(
            company_id=company_id,
            timeframe=timeframe,
            exclude_solved=exclude_solved,
            actor_user_id=actor_user_id,
            actor_email=actor_email,
            payload_hash=payload_hash,
            counts=counts,
            question_ids=question_ids,
            errors=errors
        )
        
        return CommitResponse(
            counts=counts,
            import_id=str(import_id),
            errors=errors
        )
    
    async def _check_existing_company_questions(
        self,
        questions: List[NormalizedQuestion],
        company_id: ObjectId,
        timeframe: str
    ) -> Dict[str, Any]:
        """
        Check which questions already exist for this company and timeframe.
        
        Args:
            questions: List of normalized questions
            company_id: Company ObjectId
            timeframe: Timeframe string
            
        Returns:
            Dict mapping "link_timeframe" to existing question document
        """
        links = [q.link for q in questions]
        
        cursor = self.db.questions.find({
            'link': {'$in': links},
            'company_id': company_id,
            'timeframe': timeframe
        })
        
        existing_map = {}
        async for doc in cursor:
            key = f"{doc['link']}_{timeframe}"
            existing_map[key] = doc
        
        return existing_map
    
    async def _upsert_company_questions(
        self,
        questions: List[NormalizedQuestion],
        company_id: ObjectId,
        timeframe: str
    ) -> tuple[UpsertCounts, List[ObjectId]]:
        """
        Upsert questions for a company and timeframe.
        
        Similar to refresh_csv logic but uses GraphQL data.
        
        Args:
            questions: List of normalized questions
            company_id: Company ObjectId
            timeframe: Timeframe string
            
        Returns:
            Tuple of (UpsertCounts, list of question ObjectIds)
        """
        created = 0
        updated = 0
        skipped = 0
        question_ids = []
        now = datetime.utcnow()
        
        # Fetch company to get legacy_id if it exists
        company = await self.db.companies.find_one({'_id': company_id})
        company_legacy_id = company.get('legacy_id') if company else None
        
        for question in questions:
            # Generate titleSlug if not present
            title_slug = question.titleSlug
            if not title_slug or not title_slug.strip():
                if question.title:
                    import re
                    # Remove special characters and convert to lowercase
                    slug = re.sub(r'[^\w\s-]', '', question.title.lower())
                    # Replace spaces with hyphens
                    title_slug = re.sub(r'[-\s]+', '-', slug).strip('-')
                elif question.link:
                    # Fallback: generate from link
                    title_slug = question.link.rstrip('/').split('/')[-1]
                else:
                    # Last resort: use questionFrontendId
                    title_slug = f"question-{question.questionFrontendId}"
            
            # Ensure titleSlug is set
            if not title_slug:
                title_slug = f"question-{question.questionFrontendId}"
            
            # Check if question exists for this company and timeframe
            existing = await self.db.questions.find_one({
                'link': question.link,
                'company_id': company_id,
                'timeframe': timeframe
            })
            
            # Convert topics array to comma-separated string like CSV import
            topics_str = ', '.join([t.get('name', '') for t in question.topics]) if question.topics else ''
            
            update_doc = {
                'title': question.title,
                'titleSlug': title_slug,  # Use generated slug
                'link': question.link,
                'difficulty': question.difficulty,
                'frequency': question.frequency or 0,
                'acceptance_rate': question.acRate or 0.0,
                'topics': topics_str,  # Store as string like CSV import
                'company_id': company_id,
                'timeframe': timeframe,
                'source': 'graphql_import',
                'updated_at': now,
            }
            
            # Add company_legacy_id if company has one
            if company_legacy_id:
                update_doc['company_legacy_id'] = company_legacy_id
            
            if existing:
                # Update existing question
                # Preserve legacy_id if it exists
                if 'legacy_id' in existing:
                    update_doc['legacy_id'] = existing['legacy_id']
                if 'company_legacy_id' in existing:
                    update_doc['company_legacy_id'] = existing['company_legacy_id']
                
                # Clear removed flag if it was previously marked as removed
                if existing.get('metadata', {}).get('removed_on'):
                    update_doc['metadata'] = {
                        k: v for k, v in existing.get('metadata', {}).items()
                        if k != 'removed_on'
                    }
                
                await self.db.questions.update_one(
                    {'_id': existing['_id']},
                    {'$set': update_doc}
                )
                updated += 1
                question_ids.append(existing['_id'])
            else:
                # Insert new question
                update_doc['created_at'] = now
                result = await self.db.questions.insert_one(update_doc)
                created += 1
                question_ids.append(result.inserted_id)
        
        return UpsertCounts(created=created, updated=updated, skipped=skipped), question_ids
    
    async def _create_company_import_batch(
        self,
        company_id: str,
        timeframe: str,
        exclude_solved: bool,
        actor_user_id: str,
        actor_email: str,
        payload_hash: str,
        counts: Dict[str, int],
        question_ids: List[ObjectId],
        errors: List[Dict[str, Any]]
    ) -> ObjectId:
        """
        Create import batch record for company import.
        
        Args:
            company_id: Company ID
            timeframe: Timeframe string
            exclude_solved: Whether SOLVED questions were excluded
            actor_user_id: User ID performing import
            actor_email: Email of user performing import
            payload_hash: Hash of payload
            counts: Import counts
            question_ids: List of question ObjectIds
            errors: List of errors
            
        Returns:
            Import batch ObjectId
        """
        import_doc = {
            'type': 'company_graphql',
            'company_id': ObjectId(company_id),
            'timeframe': timeframe,
            'exclude_solved': exclude_solved,
            'created_at': datetime.utcnow(),
            'actor': actor_user_id,
            'actor_email': actor_email,
            'payload_hash': payload_hash,
            'counts': counts,
            'question_refs': question_ids,
            'notes': None,
            'errors': errors
        }
        
        result = await self.db.imports.insert_one(import_doc)
        return result.inserted_id


# Singleton instance
_importer_service: Optional[ImporterService] = None


def get_importer_service(db: AsyncIOMotorDatabase) -> ImporterService:
    """
    Get or create importer service instance.
    
    Args:
        db: MongoDB database instance
        
    Returns:
        ImporterService instance
    """
    # Note: We don't use a global singleton here because the service needs a db instance
    # Each call creates a new instance with the provided db
    return ImporterService(db)
