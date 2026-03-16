import subprocess
import urllib.parse

PLUGIN_INFO = {
    "name":        "Gmail",
    "version":     "1.1.0",
    "description": "Compose and send emails via Gmail in default browser",
    "author":      "ohtomato",
    "tools": [
        "gmail_compose_email",
    ],
}


async def gmail_compose_email(
    recipient: str,
    subject: str,
    body: str,
    cc: str = "",
    bcc: str = "",
    send: bool = False,
) -> dict:
    try:
        subject_encoded = urllib.parse.quote(subject)
        body_encoded = urllib.parse.quote(body)
        
        gmail_url = f"https://mail.google.com/mail/u/0/#inbox?compose=new"
        
        if recipient:
            gmail_url = f"https://mail.google.com/mail/u/0/?view=cm&fs=1&to={urllib.parse.quote(recipient)}"
        if subject:
            gmail_url += f"&su={subject_encoded}"
        if body:
            gmail_url += f"&body={body_encoded}"
        
        subprocess.Popen(["open", gmail_url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        return {
            "recipient": recipient,
            "subject": subject,
            "status": "opened",
            "message": f"Gmail compose opened in your default browser. Please fill in any remaining fields and click Send.",
        }
        
    except Exception as ex:
        return {"error": str(ex)}
