import os
import json
import re
import asyncio
from typing import Dict, Any, Optional

# Import Memory (Handles MongoDB connections automatically based on your db_config)
from Agents.MemoryHandler import MemoryHandler

# Import the REAL Data Extractor (Playwright)
from DataHandle.Utils.DataExtractor import DataExtract

# Import All Your Agents
from Agents.LearningDiscoveryAgent import LearningDiscoveryAgent
from Agents.TeachingAgent import TeachingAgent
from Agents.MentoringAgent import MentoringAgent
from Agents.ConceptExtractionAgent import ConceptExtractionAgent
from Agents.DependencyAgent import DependencyAgent
from Agents.KnowledgeGapAgent import KnowledgeGapAgent
from Agents.AssignmentTrackerAgent import AssignmentTrackerAgent
from Agents.AssignmentGeneratorAgent import AssignmentGeneratorAgent
from Agents.AssignmentEvaluatorAgent import AssignmentEvaluatorAgent

# Set default model for OpenRouter
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.1-70b-instruct")

class JinvexaLLMClient:
    """
    Cloud LLM Client connected to OpenRouter API with robust JSON parsing
    """
    def __init__(self, model: str = OPENROUTER_MODEL):
        self.model = model
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.url = "https://openrouter.ai/api/v1/chat/completions"

    async def complete(self, prompt: str, system_prompt: Optional[str] = None, json_mode: bool = False) -> str:
        if not self.api_key:
            print("❌ OPENROUTER_API_KEY is not set in environment variables.")
            return "Error: OPENROUTER_API_KEY environment variable missing on server."

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://jinvexa.com",
            "X-Title": "Jinvexa AI"
        }

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 2000
        }

        # Tell OpenRouter/Llama to enforce strict JSON output when requested
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        try:
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.url,
                    headers=headers,
                    json=payload,
                    timeout=120.0
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"❌ OpenRouter Error ({self.model}): {e}")
            return f"Error executing model {self.model}: {str(e)}"

    async def complete_with_json(self, prompt: str, system_prompt: Optional[str] = None) -> Any:
        # Request strict JSON mode from OpenRouter
        response = await self.complete(prompt, system_prompt, json_mode=True)
        
        if not response or response.startswith("Error"):
            return {}

        # 1. Clean markdown code blocks (```json ... ```)
        cleaned = re.sub(r'```(?:json)?', '', response)
        cleaned = cleaned.replace('```', '').strip()

        # 2. Extract JSON object
        json_match = re.search(r'(\{[\s\S]*\})', cleaned)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except Exception as e:
                print(f"⚠️ JSON Regex Parse Error: {e}")

        # 3. Direct JSON parse fallback
        try:
            return json.loads(cleaned)
        except Exception as e:
            print(f"⚠️ Direct JSON Parse Error: {e}")
            print(f"Raw Output: {response[:150]}...")
            return {}

class AgentOrchestrator:
    def __init__(self):
        # 1. Initialize Memory (Hooks into MongoDB)
        self.memory = MemoryHandler(storage_type="mongodb")
        
        # 2. Initialize the OpenRouter-backed LLM Client
        self.llm = JinvexaLLMClient()
        
        # 3. Initialize the REAL Data Extractor (Playwright)
        self.data_extractor = DataExtract(llm_client=self.llm)

        # 4. Initialize Helper Agents
        self.concept_extractor = ConceptExtractionAgent(llm_client=self.llm)
        self.dependency_agent = DependencyAgent(llm_client=self.llm)
        self.knowledge_gap_agent = KnowledgeGapAgent(llm_client=self.llm)

        # 5. Initialize Core User-Facing Agents
        self.discovery_agent = LearningDiscoveryAgent(
            data_extractor=self.data_extractor,
            concept_extractor=self.concept_extractor,
            dependency_agent=self.dependency_agent,
            knowledge_gap_agent=self.knowledge_gap_agent,
            llm_client=self.llm,
            memory_handler=self.memory
        )

        self.teaching_agent = TeachingAgent(llm_client=self.llm, memory_handler=self.memory)
        self.mentoring_agent = MentoringAgent(llm_client=self.llm, memory_handler=self.memory)
        self.assignment_tracker = AssignmentTrackerAgent(llm_client=self.llm, memory_handler=self.memory)
        self.assignment_generator = AssignmentGeneratorAgent(llm_client=self.llm, memory_handler=self.memory)
        self.assignment_evaluator = AssignmentEvaluatorAgent(
            llm_client=self.llm, 
            memory_handler=self.memory, 
            assignment_generator=self.assignment_generator
        )

# Create a single global instance to be imported by FastAPI
orchestrator = AgentOrchestrator()
