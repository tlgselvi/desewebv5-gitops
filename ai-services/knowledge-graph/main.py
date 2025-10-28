from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import networkx as nx
import json
import time
from typing import List, Dict, Any, Optional, Tuple
import logging
from dataclasses import dataclass
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="EA Plan v6.0 Knowledge Graph API", version="1.0.0")

class EntityType(str, Enum):
    PERSON = "person"
    ORGANIZATION = "organization"
    LOCATION = "location"
    CONCEPT = "concept"
    EVENT = "event"
    PRODUCT = "product"
    TECHNOLOGY = "technology"

class RelationType(str, Enum):
    WORKS_FOR = "works_for"
    LOCATED_IN = "located_in"
    RELATED_TO = "related_to"
    PART_OF = "part_of"
    CREATED_BY = "created_by"
    USES = "uses"
    COMPETES_WITH = "competes_with"
    COLLABORATES_WITH = "collaborates_with"

@dataclass
class Entity:
    id: str
    name: str
    entity_type: EntityType
    properties: Dict[str, Any]
    confidence: float

@dataclass
class Relation:
    source: str
    target: str
    relation_type: RelationType
    properties: Dict[str, Any]
    confidence: float

class KnowledgeGraphRequest(BaseModel):
    query: str
    entity_types: Optional[List[EntityType]] = None
    relation_types: Optional[List[RelationType]] = None
    max_depth: int = 3
    limit: int = 50

class EntitySearchRequest(BaseModel):
    name: str
    entity_type: Optional[EntityType] = None
    fuzzy_match: bool = True

class GraphQueryResponse(BaseModel):
    entities: List[Dict[str, Any]]
    relations: List[Dict[str, Any]]
    paths: List[List[str]]
    processing_time_ms: float
    query_metadata: Dict[str, Any]

class EntityResponse(BaseModel):
    entity: Dict[str, Any]
    related_entities: List[Dict[str, Any]]
    processing_time_ms: float

class KnowledgeGraph:
    def __init__(self):
        self.graph = nx.MultiDiGraph()
        self.entities = {}
        self.relations = []
        self.load_sample_data()
    
    def load_sample_data(self):
        """Load sample knowledge graph data"""
        # Sample entities
        entities_data = [
            {"id": "e1", "name": "Apple Inc.", "type": EntityType.ORGANIZATION, "properties": {"industry": "technology", "founded": 1976, "revenue": "365B"}, "confidence": 0.95},
            {"id": "e2", "name": "Tim Cook", "type": EntityType.PERSON, "properties": {"position": "CEO", "age": 63, "education": "MBA"}, "confidence": 0.98},
            {"id": "e3", "name": "Cupertino", "type": EntityType.LOCATION, "properties": {"state": "California", "country": "USA", "population": 60000}, "confidence": 0.92},
            {"id": "e4", "name": "iPhone", "type": EntityType.PRODUCT, "properties": {"category": "smartphone", "launched": 2007, "price_range": "699-1199"}, "confidence": 0.97},
            {"id": "e5", "name": "iOS", "type": EntityType.TECHNOLOGY, "properties": {"type": "operating_system", "version": "17.0", "platform": "mobile"}, "confidence": 0.96},
            {"id": "e6", "name": "Machine Learning", "type": EntityType.CONCEPT, "properties": {"field": "artificial_intelligence", "applications": ["prediction", "classification"], "complexity": "high"}, "confidence": 0.89},
            {"id": "e7", "name": "WWDC 2023", "type": EntityType.EVENT, "properties": {"date": "2023-06-05", "location": "Cupertino", "attendees": 5000}, "confidence": 0.91},
            {"id": "e8", "name": "Samsung", "type": EntityType.ORGANIZATION, "properties": {"industry": "technology", "founded": 1938, "revenue": "200B"}, "confidence": 0.94},
            {"id": "e9", "name": "Android", "type": EntityType.TECHNOLOGY, "properties": {"type": "operating_system", "version": "14", "platform": "mobile"}, "confidence": 0.95},
            {"id": "e10", "name": "Smartphone Market", "type": EntityType.CONCEPT, "properties": {"market_size": "1.5T", "growth_rate": "5%", "competition": "high"}, "confidence": 0.88}
        ]
        
        # Add entities to graph
        for entity_data in entities_data:
            entity = Entity(
                id=entity_data["id"],
                name=entity_data["name"],
                entity_type=entity_data["type"],
                properties=entity_data["properties"],
                confidence=entity_data["confidence"]
            )
            self.entities[entity.id] = entity
            self.graph.add_node(entity.id, **entity.__dict__)
        
        # Sample relations
        relations_data = [
            {"source": "e2", "target": "e1", "type": RelationType.WORKS_FOR, "properties": {"since": 2011, "position": "CEO"}, "confidence": 0.99},
            {"source": "e1", "target": "e3", "type": RelationType.LOCATED_IN, "properties": {"headquarters": True}, "confidence": 0.98},
            {"source": "e1", "target": "e4", "type": RelationType.CREATED_BY, "properties": {"launched": 2007}, "confidence": 0.97},
            {"source": "e4", "target": "e5", "type": RelationType.USES, "properties": {"primary_os": True}, "confidence": 0.96},
            {"source": "e5", "target": "e6", "type": RelationType.USES, "properties": {"ai_features": True}, "confidence": 0.85},
            {"source": "e1", "target": "e7", "type": RelationType.CREATED_BY, "properties": {"organizer": True}, "confidence": 0.92},
            {"source": "e1", "target": "e8", "type": RelationType.COMPETES_WITH, "properties": {"market": "smartphones"}, "confidence": 0.90},
            {"source": "e8", "target": "e9", "type": RelationType.CREATED_BY, "properties": {"primary_os": True}, "confidence": 0.95},
            {"source": "e4", "target": "e10", "type": RelationType.PART_OF, "properties": {"market_share": "20%"}, "confidence": 0.88},
            {"source": "e9", "target": "e10", "type": RelationType.PART_OF, "properties": {"market_share": "70%"}, "confidence": 0.89}
        ]
        
        # Add relations to graph
        for relation_data in relations_data:
            relation = Relation(
                source=relation_data["source"],
                target=relation_data["target"],
                relation_type=relation_data["type"],
                properties=relation_data["properties"],
                confidence=relation_data["confidence"]
            )
            self.relations.append(relation)
            self.graph.add_edge(relation.source, relation.target, **relation.__dict__)
    
    def search_entities(self, name: str, entity_type: Optional[EntityType] = None, fuzzy_match: bool = True) -> List[Entity]:
        """Search for entities by name"""
        results = []
        
        for entity in self.entities.values():
            if entity_type and entity.entity_type != entity_type:
                continue
            
            if fuzzy_match:
                # Simple fuzzy matching (in real implementation, use proper fuzzy matching)
                if name.lower() in entity.name.lower() or entity.name.lower() in name.lower():
                    results.append(entity)
            else:
                if entity.name.lower() == name.lower():
                    results.append(entity)
        
        return sorted(results, key=lambda x: x.confidence, reverse=True)
    
    def get_entity_neighbors(self, entity_id: str, max_depth: int = 2) -> Tuple[List[Entity], List[Relation]]:
        """Get neighbors of an entity within specified depth"""
        if entity_id not in self.graph:
            return [], []
        
        # Get all nodes within max_depth
        reachable_nodes = set()
        current_level = {entity_id}
        
        for depth in range(max_depth):
            next_level = set()
            for node in current_level:
                reachable_nodes.add(node)
                # Get neighbors (both incoming and outgoing)
                next_level.update(self.graph.successors(node))
                next_level.update(self.graph.predecessors(node))
            current_level = next_level - reachable_nodes
        
        # Get entities and relations
        entities = [self.entities[node_id] for node_id in reachable_nodes if node_id in self.entities]
        relations = [rel for rel in self.relations if rel.source in reachable_nodes and rel.target in reachable_nodes]
        
        return entities, relations
    
    def find_paths(self, source: str, target: str, max_length: int = 5) -> List[List[str]]:
        """Find paths between two entities"""
        if source not in self.graph or target not in self.graph:
            return []
        
        try:
            paths = list(nx.all_simple_paths(self.graph, source, target, cutoff=max_length))
            return paths[:10]  # Limit to 10 paths
        except nx.NetworkXNoPath:
            return []
    
    def query_graph(self, query: str, entity_types: Optional[List[EntityType]] = None, 
                   relation_types: Optional[List[RelationType]] = None, 
                   max_depth: int = 3, limit: int = 50) -> Tuple[List[Entity], List[Relation], List[List[str]]]:
        """Query the knowledge graph"""
        # Simple query processing (in real implementation, use NLP to parse queries)
        query_lower = query.lower()
        
        # Find relevant entities
        relevant_entities = []
        for entity in self.entities.values():
            if entity_type and entity.entity_type not in entity_types:
                continue
            
            # Check if query terms match entity name or properties
            if any(term in entity.name.lower() for term in query_lower.split()):
                relevant_entities.append(entity)
            elif any(term in str(entity.properties).lower() for term in query_lower.split()):
                relevant_entities.append(entity)
        
        # Get neighbors of relevant entities
        all_entities = set()
        all_relations = []
        paths = []
        
        for entity in relevant_entities[:5]:  # Limit to top 5 entities
            neighbors, relations = self.get_entity_neighbors(entity.id, max_depth)
            all_entities.update(neighbors)
            all_relations.extend(relations)
            
            # Find paths between relevant entities
            for other_entity in relevant_entities:
                if entity.id != other_entity.id:
                    entity_paths = self.find_paths(entity.id, other_entity.id, max_depth)
                    paths.extend(entity_paths)
        
        # Filter relations by type if specified
        if relation_types:
            all_relations = [rel for rel in all_relations if rel.relation_type in relation_types]
        
        # Limit results
        entities_list = list(all_entities)[:limit]
        relations_list = all_relations[:limit]
        paths_list = paths[:10]
        
        return entities_list, relations_list, paths_list

# Initialize service
kg_service = KnowledgeGraph()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "knowledge-graph",
        "graph_stats": {
            "total_entities": len(kg_service.entities),
            "total_relations": len(kg_service.relations),
            "graph_nodes": kg_service.graph.number_of_nodes(),
            "graph_edges": kg_service.graph.number_of_edges()
        },
        "version": "1.0.0"
    }

@app.post("/search/entities", response_model=EntityResponse)
async def search_entities(request: EntitySearchRequest):
    """Search for entities in the knowledge graph"""
    start_time = time.time()
    
    try:
        entities = kg_service.search_entities(request.name, request.entity_type, request.fuzzy_match)
        
        if not entities:
            raise HTTPException(status_code=404, detail="No entities found")
        
        # Get the best match and its neighbors
        best_entity = entities[0]
        related_entities, relations = kg_service.get_entity_neighbors(best_entity.id, max_depth=2)
        
        processing_time = (time.time() - start_time) * 1000
        
        return EntityResponse(
            entity={
                "id": best_entity.id,
                "name": best_entity.name,
                "type": best_entity.entity_type,
                "properties": best_entity.properties,
                "confidence": best_entity.confidence
            },
            related_entities=[
                {
                    "id": entity.id,
                    "name": entity.name,
                    "type": entity.entity_type,
                    "properties": entity.properties,
                    "confidence": entity.confidence
                }
                for entity in related_entities[:10]
            ],
            processing_time_ms=processing_time
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query", response_model=GraphQueryResponse)
async def query_knowledge_graph(request: KnowledgeGraphRequest):
    """Query the knowledge graph"""
    start_time = time.time()
    
    try:
        entities, relations, paths = kg_service.query_graph(
            request.query,
            request.entity_types,
            request.relation_types,
            request.max_depth,
            request.limit
        )
        
        processing_time = (time.time() - start_time) * 1000
        
        return GraphQueryResponse(
            entities=[
                {
                    "id": entity.id,
                    "name": entity.name,
                    "type": entity.entity_type,
                    "properties": entity.properties,
                    "confidence": entity.confidence
                }
                for entity in entities
            ],
            relations=[
                {
                    "source": relation.source,
                    "target": relation.target,
                    "type": relation.relation_type,
                    "properties": relation.properties,
                    "confidence": relation.confidence
                }
                for relation in relations
            ],
            paths=paths,
            processing_time_ms=processing_time,
            query_metadata={
                "query": request.query,
                "entity_types": request.entity_types,
                "relation_types": request.relation_types,
                "max_depth": request.max_depth,
                "limit": request.limit
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/entities/{entity_id}")
async def get_entity_details(entity_id: str):
    """Get detailed information about an entity"""
    if entity_id not in kg_service.entities:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    entity = kg_service.entities[entity_id]
    neighbors, relations = kg_service.get_entity_neighbors(entity_id, max_depth=2)
    
    return {
        "entity": {
            "id": entity.id,
            "name": entity.name,
            "type": entity.entity_type,
            "properties": entity.properties,
            "confidence": entity.confidence
        },
        "neighbors": [
            {
                "id": neighbor.id,
                "name": neighbor.name,
                "type": neighbor.entity_type,
                "confidence": neighbor.confidence
            }
            for neighbor in neighbors[:20]
        ],
        "relations": [
            {
                "source": relation.source,
                "target": relation.target,
                "type": relation.relation_type,
                "properties": relation.properties,
                "confidence": relation.confidence
            }
            for relation in relations[:20]
        ]
    }

@app.get("/analytics/graph-stats")
async def get_graph_analytics():
    """Get analytics about the knowledge graph"""
    # Calculate graph metrics
    centrality = nx.degree_centrality(kg_service.graph)
    betweenness = nx.betweenness_centrality(kg_service.graph)
    
    # Entity type distribution
    entity_type_counts = {}
    for entity in kg_service.entities.values():
        entity_type_counts[entity.entity_type] = entity_type_counts.get(entity.entity_type, 0) + 1
    
    # Relation type distribution
    relation_type_counts = {}
    for relation in kg_service.relations:
        relation_type_counts[relation.relation_type] = relation_type_counts.get(relation.relation_type, 0) + 1
    
    return {
        "graph_metrics": {
            "total_entities": len(kg_service.entities),
            "total_relations": len(kg_service.relations),
            "average_degree": sum(dict(kg_service.graph.degree()).values()) / kg_service.graph.number_of_nodes(),
            "density": nx.density(kg_service.graph),
            "connected_components": nx.number_connected_components(kg_service.graph.to_undirected())
        },
        "entity_distribution": entity_type_counts,
        "relation_distribution": relation_type_counts,
        "top_entities": [
            {
                "id": entity_id,
                "name": kg_service.entities[entity_id].name,
                "centrality": centrality[entity_id],
                "betweenness": betweenness[entity_id]
            }
            for entity_id in sorted(centrality.keys(), key=lambda x: centrality[x], reverse=True)[:10]
        ]
    }

@app.get("/models/info")
async def get_models_info():
    """Get information about the knowledge graph"""
    return {
        "graph_info": {
            "nodes": kg_service.graph.number_of_nodes(),
            "edges": kg_service.graph.number_of_edges(),
            "is_directed": kg_service.graph.is_directed(),
            "is_multigraph": kg_service.graph.is_multigraph()
        },
        "capabilities": [
            "entity-search",
            "graph-query",
            "path-finding",
            "neighbor-analysis",
            "graph-analytics",
            "relation-discovery"
        ],
        "supported_entity_types": [e.value for e in EntityType],
        "supported_relation_types": [r.value for r in RelationType]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
