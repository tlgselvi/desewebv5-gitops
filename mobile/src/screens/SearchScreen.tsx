/**
 * Search Screen
 * 
 * Semantic search interface
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSearch } from '../hooks/useSearch.js';
import type { SearchResult } from '../types/index.js';

export function SearchScreen() {
  const [query, setQuery] = useState('');
  const [useRAG, setUseRAG] = useState(true);
  const { results, loading, error, search } = useSearch();

  const performSearch = () => {
    if (!query.trim()) return;
    search(query, { topK: 10, useRAG });
  };

  const renderResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity style={styles.resultItem}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultSource}>{item.source}</Text>
        <Text style={styles.resultScore}>
          {(item.score * 100).toFixed(0)}% eşleşme
        </Text>
      </View>
      <Text style={styles.resultSnippet}>
        {item.snippet || item.content.substring(0, 200)}
      </Text>
      <Text style={styles.resultType}>{item.sourceType}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Arama yapın..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={performSearch}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={performSearch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.searchButtonText}>Ara</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={[styles.optionButton, useRAG && styles.optionButtonActive]}
          onPress={() => setUseRAG(!useRAG)}
        >
          <Text style={[styles.optionText, useRAG && styles.optionTextActive]}>
            RAG ile Gelişmiş Arama
          </Text>
        </TouchableOpacity>
      </View>

      {results.length > 0 && (
        <Text style={styles.resultsCount}>
          {results.length} sonuç bulundu
        </Text>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={results}
        renderItem={renderResult}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          !loading && query ? (
            <Text style={styles.emptyText}>
              {error ? 'Arama başarısız oldu' : 'Sonuç bulunamadı'}
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  optionsContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  optionButton: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  optionButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
  },
  optionTextActive: {
    color: '#fff',
  },
  resultsCount: {
    padding: 15,
    fontSize: 14,
    color: '#666',
  },
  resultItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    marginHorizontal: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultSource: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  resultScore: {
    fontSize: 12,
    color: '#666',
  },
  resultSnippet: {
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 8,
    lineHeight: 20,
  },
  resultType: {
    fontSize: 11,
    color: '#999',
  },
  emptyText: {
    textAlign: 'center',
    padding: 40,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    padding: 15,
    backgroundColor: '#FFEBEE',
    margin: 15,
    borderRadius: 8,
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
  },
});

