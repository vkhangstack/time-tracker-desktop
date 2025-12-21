package backend

import (
	"sync"
	"time"
)

// CacheEntry represents a cached item with expiry
type CacheEntry struct {
	Value     interface{}
	Expiry    time.Time
	HasExpiry bool
}

// Cache is a thread-safe in-memory cache
type Cache struct {
	data  map[string]*CacheEntry
	mutex sync.RWMutex
}

// NewCache creates a new Cache instance
func NewCache() *Cache {
	c := &Cache{
		data: make(map[string]*CacheEntry),
	}
	// Start cleanup goroutine
	go c.cleanupExpired()
	return c
}

// Set stores a value in cache without expiry
func (c *Cache) Set(key string, value interface{}) {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	c.data[key] = &CacheEntry{
		Value:     value,
		HasExpiry: false,
	}
}

// SetWithExpiry stores a value in cache with TTL
func (c *Cache) SetWithExpiry(key string, value interface{}, ttl time.Duration) {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	c.data[key] = &CacheEntry{
		Value:     value,
		Expiry:    time.Now().Add(ttl),
		HasExpiry: true,
	}
}

// Get retrieves a value from cache
func (c *Cache) Get(key string) (interface{}, bool) {
	c.mutex.RLock()
	defer c.mutex.RUnlock()

	entry, exists := c.data[key]
	if !exists {
		return nil, false
	}

	// Check if expired
	if entry.HasExpiry && time.Now().After(entry.Expiry) {
		return nil, false
	}

	return entry.Value, true
}

// Delete removes a value from cache
func (c *Cache) Delete(key string) {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	delete(c.data, key)
}

// Clear removes all values from cache
func (c *Cache) Clear() {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	c.data = make(map[string]*CacheEntry)
}

// cleanupExpired periodically removes expired entries
func (c *Cache) cleanupExpired() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		c.mutex.Lock()
		now := time.Now()
		for key, entry := range c.data {
			if entry.HasExpiry && now.After(entry.Expiry) {
				delete(c.data, key)
			}
		}
		c.mutex.Unlock()
	}
}
