import logging
from typing import Optional
from pydantic import BaseModel
from app.services.crawler.reliability import is_safe_url

logger = logging.getLogger(__name__)

class RenderedPageResult(BaseModel):
    success: bool
    html: Optional[str] = None
    final_url: Optional[str] = None
    status_code: Optional[int] = None
    error: Optional[str] = None

class BrowserRenderer:
    def __init__(self, headless: bool = True, timeout_ms: int = 30000):
        self.headless = headless
        self.timeout_ms = timeout_ms

    def render(self, url: str) -> RenderedPageResult:
        if not is_safe_url(url):
            return RenderedPageResult(success=False, error="Unsafe URL provided")
            
        try:
            from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError, Error as PlaywrightError
        except ImportError:
            return RenderedPageResult(success=False, error="Playwright is not installed")

        try:
            with sync_playwright() as p:
                browser = None
                context = None
                page = None
                try:
                    logger.info(f"playwright_fallback_started: Launching browser for {url}")
                    # Launch chromium
                    browser = p.chromium.launch(headless=self.headless)
                    
                    # Create isolated context
                    context = browser.new_context(
                        user_agent="JobWatcher/1.0 (Job Discovery Crawler Fallback)"
                    )
                    
                    page = context.new_page()
                    
                    # Navigate and wait for DOM
                    response = page.goto(url, timeout=self.timeout_ms, wait_until="domcontentloaded")
                    if not response:
                        return RenderedPageResult(success=False, error="Navigation failed, no response")
                        
                    logger.info("playwright_navigation_completed")
                    
                    # Bounded wait for JS rendering
                    # We don't use infinite networkidle, just wait a short moment for typical SPA render
                    page.wait_for_timeout(2000)
                    
                    final_url = page.url
                    if not is_safe_url(final_url):
                        return RenderedPageResult(success=False, error=f"Redirected to unsafe URL: {final_url}")
                        
                    html = page.content()
                    
                    # Safety check on HTML size (e.g. max 5MB)
                    if len(html.encode("utf-8")) > 5 * 1024 * 1024:
                        return RenderedPageResult(success=False, error="Rendered HTML exceeds 5MB limit")
                        
                    logger.info(f"playwright_render_completed: HTML size {len(html)} chars")
                    
                    return RenderedPageResult(
                        success=True,
                        html=html,
                        final_url=final_url,
                        status_code=response.status
                    )
                except PlaywrightTimeoutError as e:
                    logger.error("playwright_fallback_failed: Timeout")
                    return RenderedPageResult(success=False, error=f"Browser timeout: {str(e)}")
                except PlaywrightError as e:
                    logger.error(f"playwright_fallback_failed: {e}")
                    return RenderedPageResult(success=False, error=f"Browser error: {str(e)}")
                finally:
                    if page:
                        page.close()
                    if context:
                        context.close()
                    if browser:
                        browser.close()
                    logger.info("playwright_fallback_completed: Cleanup done")
        except Exception as e:
            logger.exception("playwright_fallback_failed: Unexpected error")
            return RenderedPageResult(success=False, error=f"Unexpected rendering error: {str(e)}")
