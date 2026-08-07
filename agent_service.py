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

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma4:31b-cloud")

class JinvexaLLMClient:
    """
    Ollama LLM Client connected to gemma4:31b-cloud
    """
    def __init__(self, model: str = OLLAMA_MODEL):
        self.model = model
        try:
            import ollama
            self.ollama = ollama
        except ImportError:
            self.ollama = None
            print("⚠️ 'ollama' package not installed. Run: pip install ollama")

    async def complete(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            if self.ollama:
                response = await asyncio.to_thread(
                    self.ollama.chat,
                    model=self.model,
                    messages=messages,
                    options={"temperature": 0.3, "num_predict": 2000}
                )
                if hasattr(response, 'message'):
                    if hasattr(response.message, 'content'):
                        return response.message.content
                    elif isinstance(response.message, dict):
                        return response.message.get('content', '')
                elif isinstance(response, dict):
                    return response.get('message', {}).get('content', '')
                return str(response)
            else:
                import httpx
                async with httpx.AsyncClient() as client:
                    res = await client.post("http://localhost:11434/api/chat", json={
                        "model": self.model,
                        "messages": messages,
                        "stream": False
                    }, timeout=120.0)
                    return res.json().get("message", {}).get("content", "")
        except Exception as e:
            print(f"❌ Ollama Error ({self.model}): {e}")
            return f"Error executing model {self.model}: {str(e)}"

    async def complete_with_json(self, prompt: str, system_prompt: Optional[str] = None) -> Any:
        response = await self.complete(prompt, system_prompt)
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except Exception:
                pass
        try:
            return json.loads(response)
        except Exception:
            return {}

class AgentOrchestrator:
    def __init__(self):
        # 1. Initialize Memory (Hooks into MongoDB)
        self.memory = MemoryHandler(storage_type="mongodb")
        
        # 2. Initialize the LLM Client
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