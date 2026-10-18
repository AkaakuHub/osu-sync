import httpx


def download_error_message(error: Exception) -> str:
    if isinstance(error, httpx.HTTPStatusError):
        status = error.response.status_code
        if status == 403:
            return "Download server denied access (HTTP 403)."
        return f"Download server returned HTTP {status}."
    if isinstance(error, httpx.TimeoutException):
        return "Download timed out."
    if isinstance(error, httpx.RequestError):
        return "Could not connect to the download server."
    if isinstance(error, OSError):
        return "Could not save the downloaded file."
    return "Download failed."
