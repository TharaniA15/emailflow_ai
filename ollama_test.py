from langchain_ollama import OllamaLLM

OLLAMA_BASE_URL = "https://ollama-llm-995224459939.asia-southeast1.run.app"

llm = OllamaLLM(
    model="mistral:7b",
    base_url=OLLAMA_BASE_URL,
    timeout=120,
)

response = llm.invoke("Hi")

print(response)