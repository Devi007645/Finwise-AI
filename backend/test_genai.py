import os
from google import genai

print("Imported genai")
client = genai.Client(api_key="TEST")
print("Client initialized")

try:
    print("Methods on client.aio.models:")
    print(dir(client.aio.models))
except Exception as e:
    print(f"Error: {e}")

try:
    print("Config class:")
    print(dir(genai.types.GenerateContentConfig))
except Exception as e:
    print(f"Error: {e}")

try:
    print("Part class:")
    print(dir(genai.types.Part))
except Exception as e:
    print(f"Error: {e}")
