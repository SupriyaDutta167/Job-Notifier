class JobWatcherException(Exception):
    """Base exception for the application."""
    pass

class NotFoundError(JobWatcherException):
    """Raised when an entity is not found."""
    pass

class ConflictError(JobWatcherException):
    """Raised when an operation violates a unique constraint or business rule conflict."""
    pass

class ForbiddenError(JobWatcherException):
    """Raised when a user is not authorized to perform an action."""
    pass
