"""WhatsApp Cloud API client for Fantasy Darts (S19)."""

import hashlib
import hmac
import os
import re

import httpx

GRAPH_API_VERSION = "v21.0"
GRAPH_API_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"


class WhatsAppClient:
    """Async client for Meta WhatsApp Cloud API."""

    def __init__(self):
        self.phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
        self.access_token = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
        self.verify_token = os.getenv("WHATSAPP_VERIFY_TOKEN", "fantasy-darts-webhook-2026")
        self.app_secret = os.getenv("WHATSAPP_APP_SECRET", "")

    @staticmethod
    def format_phone(phone: str) -> str:
        """Strip non-digit characters for E.164 format (without leading +)."""
        return re.sub(r"[^\d]", "", phone)

    async def send_template(
        self,
        to_phone: str,
        template_name: str,
        language: str = "en",
        components: list | None = None,
    ) -> dict:
        """Send a WhatsApp template message via Meta Graph API.

        Returns dict with 'success', 'meta_message_id', and optional 'error'.
        """
        if not self.phone_number_id or not self.access_token:
            return {"success": False, "meta_message_id": None, "error": "WhatsApp not configured"}

        url = f"{GRAPH_API_BASE}/{self.phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

        payload: dict = {
            "messaging_product": "whatsapp",
            "to": self.format_phone(to_phone),
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language},
            },
        }

        if components:
            payload["template"]["components"] = components

        async with httpx.AsyncClient(timeout=30) as client:
            try:
                resp = await client.post(url, json=payload, headers=headers)
                data = resp.json()

                if resp.status_code == 200 and "messages" in data:
                    msg_id = data["messages"][0].get("id", "")
                    return {"success": True, "meta_message_id": msg_id, "error": None}
                else:
                    error_msg = data.get("error", {}).get("message", resp.text[:200])
                    return {"success": False, "meta_message_id": None, "error": error_msg}
            except httpx.HTTPError as e:
                return {"success": False, "meta_message_id": None, "error": str(e)}

    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """Verify incoming webhook payload using HMAC-SHA256.

        The signature header is formatted as 'sha256=<hex_digest>'.
        """
        if not self.app_secret:
            return True  # Skip verification in dev if no secret configured

        if not signature.startswith("sha256="):
            return False

        expected = hmac.new(self.app_secret.encode(), payload, hashlib.sha256).hexdigest()
        return hmac.compare_digest(f"sha256={expected}", signature)


# Singleton instance
whatsapp_client = WhatsAppClient()
