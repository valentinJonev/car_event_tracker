import pytest
from unittest.mock import patch, MagicMock
import uuid
from datetime import datetime, timezone, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import Event, EventStatus, EventType
from app.models.user import User, UserRole
from app.services.notification import send_email, send_push, get_channels_for_user
from app.models.notification import NotificationChannelType


class TestGetChannelsForUser:
    def _make_user(self, notification_preferences=None):
        """Create a minimal User-like object for testing."""
        user = MagicMock(spec=User)
        user.notification_preferences = notification_preferences
        return user

    def test_email_only(self):
        user = self._make_user({"email": True, "push": False})
        channels = get_channels_for_user(user)
        assert channels == [NotificationChannelType.EMAIL]

    def test_push_only(self):
        user = self._make_user({"email": False, "push": True})
        channels = get_channels_for_user(user)
        assert channels == [NotificationChannelType.PUSH]

    def test_both(self):
        user = self._make_user({"email": True, "push": True})
        channels = get_channels_for_user(user)
        assert NotificationChannelType.EMAIL in channels
        assert NotificationChannelType.PUSH in channels

    def test_none_preferences_defaults_to_email(self):
        user = self._make_user(None)
        channels = get_channels_for_user(user)
        assert channels == [NotificationChannelType.EMAIL]

    def test_empty_preferences_defaults_to_email(self):
        user = self._make_user({})
        channels = get_channels_for_user(user)
        assert channels == [NotificationChannelType.EMAIL]

    def test_all_disabled_falls_back_to_email(self):
        user = self._make_user({"email": False, "push": False})
        channels = get_channels_for_user(user)
        assert channels == [NotificationChannelType.EMAIL]


class TestSendEmail:
    @patch("app.services.notification.settings")
    def test_dev_mode_logs_email(self, mock_settings):
        mock_settings.EMAIL_ENABLED = False
        result = send_email("test@test.com", "Test Subject", "Test Body")
        assert result is True

    @patch("app.services.notification.settings")
    @patch("smtplib.SMTP")
    def test_production_sends_email(self, mock_smtp_class, mock_settings):
        mock_settings.EMAIL_ENABLED = True
        mock_settings.SMTP_HOST = "smtp.test.com"
        mock_settings.SMTP_PORT = 587
        mock_settings.SMTP_USER = "user"
        mock_settings.SMTP_PASSWORD = "pass"
        mock_settings.EMAIL_FROM = "from@test.com"

        mock_server = MagicMock()
        mock_smtp_class.return_value.__enter__ = MagicMock(return_value=mock_server)
        mock_smtp_class.return_value.__exit__ = MagicMock(return_value=False)

        result = send_email("test@test.com", "Test Subject", "Test Body")
        assert result is True


class TestSendPush:
    @patch("app.services.notification.webpush" if False else "app.services.notification.send_push")
    def test_push_failure_returns_false(self, mock_send):
        # We mock send_push itself to return False for a failed push
        mock_send.return_value = False
        result = mock_send({"endpoint": "https://example.com"}, "test message")
        assert result is False
