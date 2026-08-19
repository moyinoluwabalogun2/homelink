import re
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.user import UserRead


PHONE_PATTERN = re.compile(r"^\+?[0-9]{10,15}$")


def validate_secure_password(value: str) -> str:
    if len(value) < 10:
        raise ValueError("Password must contain at least 10 characters.")
    if not any(character.islower() for character in value):
        raise ValueError("Password must contain a lowercase letter.")
    if not any(character.isupper() for character in value):
        raise ValueError("Password must contain an uppercase letter.")
    if not any(character.isdigit() for character in value):
        raise ValueError("Password must contain a number.")
    return value


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    phone: str = Field(min_length=10, max_length=32)
    password: str = Field(min_length=10, max_length=128)
    accept_terms: Literal[True]
    acknowledge_privacy: Literal[True]
    marketing_consent: bool = False

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, value: str) -> str:
        normalized = " ".join(value.strip().split())
        if len(normalized) < 2:
            raise ValueError("Full name is required.")
        return normalized

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str) -> str:
        normalized = re.sub(r"[\s\-()]", "", value.strip())
        if not PHONE_PATTERN.fullmatch(normalized):
            raise ValueError("Enter a valid phone number containing 10 to 15 digits.")
        return normalized

    @field_validator("password")
    @classmethod
    def check_password(cls, value: str) -> str:
        return validate_secure_password(value)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=20, max_length=500)
    new_password: str = Field(min_length=10, max_length=128)

    @field_validator("new_password")
    @classmethod
    def check_password(cls, value: str) -> str:
        return validate_secure_password(value)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=10, max_length=128)

    @field_validator("new_password")
    @classmethod
    def check_password(cls, value: str) -> str:
        return validate_secure_password(value)


class AuthResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: UserRead


class MessageResponse(BaseModel):
    message: str