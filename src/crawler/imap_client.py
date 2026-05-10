"""Gmail IMAP client for fetching emails."""
import email
import imaplib
import logging
import re
import ssl
import time
from dataclasses import dataclass
from typing import List, Optional

from src.config import settings

logger = logging.getLogger(__name__)


@dataclass
class EmailMessage:
    """Represents a parsed email message."""

    message_id: str
    sender: str
    subject: str
    received_at: str
    body: str


class IMAPClient:
    """Client for connecting to Gmail via IMAP and fetching emails."""

    GMAIL_IMAP_SERVER = "imap.gmail.com"
    GMAIL_IMAP_PORT = 993
    MAX_RETRIES = 3
    RETRY_DELAY = 2  # seconds

    def __init__(
        self,
        email_address: Optional[str] = None,
        app_password: Optional[str] = None,
    ) -> None:
        """Initialize the IMAP client.

        Args:
            email_address: Gmail address. Defaults to settings.GMAIL_EMAIL.
            app_password: Gmail app password. Defaults to settings.GMAIL_APP_PASSWORD.
        """
        self.email_address = email_address or settings.GMAIL_EMAIL
        self.app_password = app_password or settings.GMAIL_APP_PASSWORD
        self.sender_filter = settings.GMAIL_SENDER_FILTER
        self.connection: Optional[imaplib.IMAP4_SSL] = None

    def connect(self) -> bool:
        """Connect to Gmail IMAP server with retry logic.

        Returns:
            True if connection successful, False otherwise.
        """
        for attempt in range(self.MAX_RETRIES):
            try:
                logger.info(
                    f"Connecting to Gmail IMAP server (attempt {attempt + 1}/{self.MAX_RETRIES})..."
                )

                # Create SSL context
                context = ssl.create_default_context()

                # Connect to server
                self.connection = imaplib.IMAP4_SSL(
                    self.GMAIL_IMAP_SERVER,
                    self.GMAIL_IMAP_PORT,
                    ssl_context=context,
                )

                # Login
                self.connection.login(self.email_address, self.app_password)
                logger.info("Successfully connected to Gmail IMAP")
                return True

            except imaplib.IMAP4.error as e:
                logger.error(f"IMAP error on attempt {attempt + 1}: {e}")
                if attempt < self.MAX_RETRIES - 1:
                    time.sleep(self.RETRY_DELAY * (attempt + 1))
                else:
                    raise
            except Exception as e:
                logger.error(f"Unexpected error on attempt {attempt + 1}: {e}")
                if attempt < self.MAX_RETRIES - 1:
                    time.sleep(self.RETRY_DELAY * (attempt + 1))
                else:
                    raise

        return False

    def disconnect(self) -> None:
        """Close the IMAP connection."""
        if self.connection:
            try:
                self.connection.close()
                self.connection.logout()
                logger.info("Disconnected from Gmail IMAP")
            except Exception as e:
                logger.warning(f"Error during disconnect: {e}")
            finally:
                self.connection = None

    def __enter__(self) -> "IMAPClient":
        """Context manager entry."""
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        """Context manager exit."""
        self.disconnect()

    def fetch_unread_emails(
        self, sender_filter: Optional[str] = None, limit: int = 100
    ) -> List[EmailMessage]:
        """Fetch unread emails from the specified sender.

        Args:
            sender_filter: Email address to filter by. Defaults to settings.GMAIL_SENDER_FILTER.
            limit: Maximum number of emails to fetch.

        Returns:
            List of EmailMessage objects.
        """
        if not self.connection:
            raise RuntimeError("Not connected to IMAP server. Call connect() first.")

        sender = sender_filter or self.sender_filter
        emails = []

        try:
            # Select the inbox
            status, messages = self.connection.select("INBOX")
            if status != "OK":
                logger.error(f"Failed to select inbox: {messages}")
                return emails

            # Search for unread emails from the sender
            search_criteria = f'(UNSEEN FROM "{sender}")'
            status, data = self.connection.search(None, search_criteria)

            if status != "OK":
                logger.error(f"Search failed: {data}")
                return emails

            # Get message IDs
            message_ids = data[0].split()
            logger.info(f"Found {len(message_ids)} unread emails from {sender}")

            # Limit the number of messages to process
            message_ids = message_ids[:limit]

            for msg_id in message_ids:
                try:
                    email_msg = self._fetch_email(msg_id)
                    if email_msg:
                        emails.append(email_msg)
                except Exception as e:
                    logger.error(f"Error fetching email {msg_id}: {e}")
                    continue

        except Exception as e:
            logger.error(f"Error fetching emails: {e}")
            raise

        logger.info(f"Successfully fetched {len(emails)} emails")
        return emails

    def fetch_all_emails(
        self, sender_filter: Optional[str] = None, limit: int = 100
    ) -> List[EmailMessage]:
        """Fetch all emails from the specified sender (including read ones).

        Args:
            sender_filter: Email address to filter by. Defaults to settings.GMAIL_SENDER_FILTER.
            limit: Maximum number of emails to fetch.

        Returns:
            List of EmailMessage objects.
        """
        if not self.connection:
            raise RuntimeError("Not connected to IMAP server. Call connect() first.")

        sender = sender_filter or self.sender_filter
        emails = []

        try:
            # Select the inbox
            status, messages = self.connection.select("INBOX")
            if status != "OK":
                logger.error(f"Failed to select inbox: {messages}")
                return emails

            # Search for all emails from the sender
            search_criteria = f'(FROM "{sender}")'
            status, data = self.connection.search(None, search_criteria)

            if status != "OK":
                logger.error(f"Search failed: {data}")
                return emails

            # Get message IDs
            message_ids = data[0].split()
            logger.info(f"Found {len(message_ids)} total emails from {sender}")

            # Limit the number of messages to process
            message_ids = message_ids[:limit]

            for msg_id in message_ids:
                try:
                    email_msg = self._fetch_email(msg_id)
                    if email_msg:
                        emails.append(email_msg)
                except Exception as e:
                    logger.error(f"Error fetching email {msg_id}: {e}")
                    continue

        except Exception as e:
            logger.error(f"Error fetching emails: {e}")
            raise

        logger.info(f"Successfully fetched {len(emails)} emails")
        return emails

    def _fetch_email(self, msg_id: bytes) -> Optional[EmailMessage]:
        """Fetch and parse a single email.

        Args:
            msg_id: The message ID.

        Returns:
            EmailMessage object or None if parsing fails.
        """
        status, msg_data = self.connection.fetch(msg_id, "(RFC822)")

        if status != "OK":
            logger.error(f"Failed to fetch message {msg_id}")
            return None

        # Parse the email
        raw_email = msg_data[0][1]
        email_message = email.message_from_bytes(raw_email)

        # Extract headers
        message_id = email_message.get("Message-ID", "")
        sender = email.utils.parseaddr(email_message.get("From", ""))[1]
        subject = email_message.get("Subject", "")
        received_at = email_message.get("Date", "")

        # Decode subject if it's encoded
        subject = self._decode_header(subject)

        # Extract body
        body = self._extract_body(email_message)

        return EmailMessage(
            message_id=message_id,
            sender=sender,
            subject=subject,
            received_at=received_at,
            body=body,
        )

    def _decode_header(self, header_value: str) -> str:
        """Decode email header (handles encoded-word format like =?UTF-8?Q?...).

        Args:
            header_value: The header string to decode.

        Returns:
            Decoded header string.
        """
        from email.header import decode_header

        decoded_parts = []
        for part, charset in decode_header(header_value):
            if isinstance(part, bytes):
                try:
                    decoded_parts.append(part.decode(charset or "utf-8", errors="replace"))
                except Exception:
                    decoded_parts.append(part.decode("utf-8", errors="replace"))
            else:
                decoded_parts.append(part)

        return "".join(decoded_parts)

    def _extract_body(self, email_message) -> str:
        """Extract the text body from an email message.

        For HTML emails, extracts URLs from anchor tags and appends them
        to the text to ensure the parser can find property URLs.

        Args:
            email_message: The email message object.

        Returns:
            The email body as text.
        """
        body = ""
        urls_found = []
        images_found = []

        if email_message.is_multipart():
            for part in email_message.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition", ""))

                # Skip attachments
                if "attachment" in content_disposition:
                    continue

                # Get text content
                if content_type == "text/plain":
                    try:
                        body = part.get_payload(decode=True).decode("utf-8", errors="ignore")
                        break
                    except Exception as e:
                        logger.warning(f"Error decoding text part: {e}")
                        continue
                elif content_type == "text/html":
                    try:
                        html_content = part.get_payload(decode=True).decode("utf-8", errors="ignore")
                        # Extract URLs and images from HTML before converting to text
                        urls_found = self._extract_urls_from_html(html_content)
                        images_found = self._extract_images_from_html(html_content)
                        # Convert HTML to text
                        body = self._html_to_text(html_content)
                    except Exception as e:
                        logger.warning(f"Error decoding HTML part: {e}")
                        continue
        else:
            # Single part message
            content_type = email_message.get_content_type()
            try:
                payload = email_message.get_payload(decode=True).decode("utf-8", errors="ignore")
                if content_type == "text/html":
                    urls_found = self._extract_urls_from_html(payload)
                    images_found = self._extract_images_from_html(payload)
                    body = self._html_to_text(payload)
                else:
                    body = payload
            except Exception as e:
                logger.warning(f"Error decoding message body: {e}")

        # Append any found URLs and images to the body so parser can find them
        metadata_lines = []
        if urls_found:
            metadata_lines.append("[URLS_FOUND]")
            metadata_lines.extend(urls_found)
        if images_found:
            metadata_lines.append("[IMAGES_FOUND]")
            images_found_unique = list(dict.fromkeys(images_found))  # Remove duplicates, preserve order
            metadata_lines.extend(images_found_unique)
        
        if metadata_lines:
            body += "\n\n" + "\n".join(metadata_lines)

        return body

    def _extract_urls_from_html(self, html_content: str) -> List[str]:
        """Extract URLs from HTML anchor tags.

        Args:
            html_content: The HTML content.

        Returns:
            List of URLs found in the HTML.
        """
        urls = []

        # Pattern to match href attributes in anchor tags - handle URLs with query params
        href_pattern = re.compile(r'href=["\'](https://www\.idealista\.com/inmueble/\d+)[^"\']*["\']')

        for match in href_pattern.finditer(html_content):
            url = match.group(1) + "/"
            if url not in urls:
                urls.append(url)

        return urls

    def _extract_images_from_html(self, html_content: str) -> List[str]:
        """Extract property image URLs from HTML img tags.

        Args:
            html_content: The HTML content.

        Returns:
            List of image URLs found in the HTML.
        """
        images = []

        # Pattern to match img src attributes - look for idealista image CDN
        # Example: https://img4.idealista.com/blur/500_375_mq/0/id.pro.es.image.master/a0/c5/cb/1370602033.jpg
        img_pattern = re.compile(
            r'src=["\'](https://img\d+\.idealista\.com/[^"\']+\.(?:jpg|jpeg|png))["\']',
            re.IGNORECASE
        )

        for match in img_pattern.finditer(html_content):
            img_url = match.group(1)
            if img_url not in images:
                images.append(img_url)

        return images

    def _html_to_text(self, html_content: str) -> str:
        """Convert HTML content to plain text.

        Args:
            html_content: The HTML content.

        Returns:
            Plain text representation.
        """
        # Remove script and style elements
        text = re.sub(r"<script[^>]*>.*?</script>", " ", html_content, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r"<style[^>]*>.*?</style>", " ", text, flags=re.DOTALL | re.IGNORECASE)

        # Replace table cells and rows with newlines to preserve structure
        text = re.sub(r"</(td|th)>", " ", text, flags=re.IGNORECASE)
        text = re.sub(r"</(tr|div|p|h[1-6]|li)>", "\n", text, flags=re.IGNORECASE)
        text = re.sub(r"<(br|BR)\s*/?>", "\n", text)

        # Remove remaining HTML tags
        text = re.sub(r"<[^>]+>", " ", text)

        # Decode HTML entities
        import html
        text = html.unescape(text)

        # Normalize whitespace within lines but preserve line breaks
        lines = text.split("\n")
        cleaned_lines = []
        for line in lines:
            # Normalize whitespace in each line
            line = re.sub(r"\s+", " ", line).strip()
            if line:
                cleaned_lines.append(line)

        return "\n".join(cleaned_lines)
