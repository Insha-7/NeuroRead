import os
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser

load_dotenv()

class FocusSelectors(BaseModel):
    main_content_selector: str = Field(description="CSS selector capturing the primary article container to isolate (e.g. 'article', 'main', '#content', '.mw-parser-output').")
    hide_selectors: str = Field(description="Comma-separated CSS selectors targeting EVERYTHING ELSE: navbars, sidebars, footers, ad containers, menus, and popups.")

prompt_template = PromptTemplate(
    template="""You are an expert Frontend DOM Analyzer specializing in accessibility and Reader Mode isolation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK: Reader Mode Isolation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Given the HTML skeleton below, you must identify:
1. The unique selector for the MAIN content/article area.
2. A broad set of selectors targeting EVERY distracting peripheral element.

REQUIREMENTS:
- For `hide_selectors`, aggressively select: `<nav>`, `<footer>`, `<aside>`, `.sidebar`, `#vector-toc`, cookie banners, social bars, ad slots, and site headers.
- If you see classes like `mw-panel`, `vector-toc-container`, `menu`, or `nav`, include them in `hide_selectors`.
- DO NOT hide the main content container or its direct ancestors.
- DO NOT hide elements inside the main content container. 

HTML SKELETON:
{skeleton}

Return ONLY valid JSON matching this schema:
{format_instructions}
""",
    input_variables=["skeleton"],
    partial_variables={"format_instructions": JsonOutputParser(pydantic_object=FocusSelectors).get_format_instructions()},
)

parser = JsonOutputParser(pydantic_object=FocusSelectors)

def generate_focus_map(html_skeleton: str) -> dict:
    llm = ChatGroq(
        api_key=os.getenv("GROQ_API_KEY"),
        model="llama-3.3-70b-versatile",
        temperature=0.1,
    )
    
    chain = prompt_template | llm | parser
    
    try:
        response = chain.invoke({"skeleton": html_skeleton})
        return response
    except Exception as e:
        print(f"[Focus Mapper] Groq Error: {e}")
        # Fallback dictionary
        return {
            "main_content_selector": "article, main, .mw-parser-output, [role='main']",
            "hide_selectors": "nav, footer, aside, .sidebar, .menu, #vector-toc, .vector-toc-container, .mw-panel, [class*='cookie'], [class*='ad-']"
        }
