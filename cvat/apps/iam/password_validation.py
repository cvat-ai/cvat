from django.core.exceptions import ValidationError


DEFAULT_MAX_PASSWORD_LENGTH = 256


class MaximumLengthPasswordValidator:
    def __init__(self, max_length: int = DEFAULT_MAX_PASSWORD_LENGTH) -> None:
        self.max_length = max_length

    def validate(self, password: str, user=None) -> None:
        if len(password) > self.max_length:
            raise ValidationError(
                f"Password must be {self.max_length} characters or fewer.",
                code="password_too_long",
            )

    def get_help_text(self) -> str:
        return f"Your password must be {self.max_length} characters or fewer."
