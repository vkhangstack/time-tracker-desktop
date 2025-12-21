package backend

import (
	"sync"

	"github.com/bwmarrin/snowflake"
)

var (
	snowflakeNode *snowflake.Node
	snowflakeOnce sync.Once
)

// InitSnowflake initializes the Snowflake ID generator
func InitSnowflake(nodeID int64) error {
	var err error
	snowflakeOnce.Do(func() {
		snowflakeNode, err = snowflake.NewNode(nodeID)
	})
	return err
}

// GenerateID generates a new unique Snowflake ID
func GenerateID() int64 {
	if snowflakeNode == nil {
		// Initialize with default node ID 1 if not already initialized
		InitSnowflake(1)
	}
	return snowflakeNode.Generate().Int64()
}
