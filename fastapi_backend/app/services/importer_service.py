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
            # Prepare question document
            question_doc = {
                'title': question.title,
                'titleSlug': question.titleSlug,
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
            
            # Check if question exists
            existing = await self.db.questions.find_one(
                {
                    'source': question.source,
                    'titleSlug': question.titleSlug
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
