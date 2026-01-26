"""
Security Question Service

Manages predefined security questions and answer hashing/verification.
"""

from passlib.context import CryptContext

# Predefined security questions
SECURITY_QUESTIONS = [
    {"id": 1, "question": "What city were you born in?"},
    {"id": 2, "question": "What was the name of your first pet?"},
    {"id": 3, "question": "What was your mother's maiden name?"},
    {"id": 4, "question": "What was the name of your elementary school?"},
    {"id": 5, "question": "What was your childhood nickname?"},
    {"id": 6, "question": "What street did you grow up on?"},
    {"id": 7, "question": "What was the make of your first car?"},
    {"id": 8, "question": "What is your favorite movie?"},
    {"id": 9, "question": "What was your favorite food as a child?"},
    {"id": 10, "question": "What is the name of your best friend from childhood?"},
]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_security_questions():
    """
    Get list of all predefined security questions.
    
    Returns:
        List of security question dictionaries with id and question
    """
    return SECURITY_QUESTIONS


def get_security_question_by_id(question_id: int):
    """
    Get a specific security question by ID.
    
    Args:
        question_id: The ID of the security question
        
    Returns:
        Security question dictionary or None if not found
    """
    for q in SECURITY_QUESTIONS:
        if q["id"] == question_id:
            return q
    return None


def hash_security_answer(answer: str) -> str:
    """
    Hash a security answer using bcrypt (same as passwords).
    
    Args:
        answer: Plain text security answer
        
    Returns:
        Hashed security answer
    """
    return pwd_context.hash(answer)


def verify_security_answer(plain_answer: str, hashed_answer: str) -> bool:
    """
    Verify a security answer against its hash.
    
    Args:
        plain_answer: Plain text answer to verify
        hashed_answer: Hashed answer from database
        
    Returns:
        True if answer matches, False otherwise
    """
    return pwd_context.verify(plain_answer, hashed_answer)
