package backend

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/option"
)

const (
	// TokenKey is the key used to store the token in the database settings
	TokenKey = "google_auth_token"
	// ClientIDKey is the key for Client ID
	ClientIDKey = "google_client_id"
	// ClientSecretKey is the key for Client Secret
	ClientSecretKey = "google_client_secret"
	// BackupFileName is the name of the backup file in Google Drive
	BackupFileName = "time-tracker-backup.json"
)

// DriveService handles Google Drive operations
type DriveService struct {
	config  *oauth2.Config
	storage *Storage
}

// NewDriveService creates a new DriveService
func NewDriveService(storage *Storage) *DriveService {
	return &DriveService{
		storage: storage,
	}
}

// getOAuthConfig returns the OAuth2 config, loading credentials from storage
func (d *DriveService) getOAuthConfig() (*oauth2.Config, error) {
	clientID, err := d.storage.GetSetting(ClientIDKey)
	if err != nil {
		return nil, err
	}
	clientSecret, err := d.storage.GetSetting(ClientSecretKey)
	if err != nil {
		return nil, err
	}

	if clientID == "" || clientSecret == "" {
		return nil, fmt.Errorf("client credentials not configured")
	}

	return &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		Scopes:       []string{drive.DriveFileScope},
		Endpoint:     google.Endpoint,
		RedirectURL:  "urn:ietf:wg:oauth:2.0:oob", // specific for desktop apps
	}, nil
}

// GetAuthURL returns the URL for the user to visit to authorize the app
func (d *DriveService) GetAuthURL() (string, error) {
	config, err := d.getOAuthConfig()
	if err != nil {
		return "", err
	}
	// AccessTypeOffline is required to get a refresh token
	return config.AuthCodeURL("state-token", oauth2.AccessTypeOffline), nil
}

// ExchangeCode exchanges the authorization code for a token and saves it
func (d *DriveService) ExchangeCode(code string) error {
	config, err := d.getOAuthConfig()
	if err != nil {
		return err
	}

	token, err := config.Exchange(context.Background(), code)
	if err != nil {
		return fmt.Errorf("unable to retrieve token from web: %v", err)
	}

	return d.saveToken(token)
}

// saveToken saves the token to storage
func (d *DriveService) saveToken(token *oauth2.Token) error {
	tokenJSON, err := json.Marshal(token)
	if err != nil {
		return err
	}
	return d.storage.SaveSetting(TokenKey, string(tokenJSON))
}

// getToken retrieves the token from storage
func (d *DriveService) getToken() (*oauth2.Token, error) {
	tokenStr, err := d.storage.GetSetting(TokenKey)
	if err != nil {
		return nil, err
	}
	if tokenStr == "" {
		return nil, fmt.Errorf("no token found")
	}

	var token oauth2.Token
	if err := json.Unmarshal([]byte(tokenStr), &token); err != nil {
		return nil, err
	}
	return &token, nil
}

// getClient creates a new Drive API client
func (d *DriveService) getClient(ctx context.Context) (*http.Client, error) {
	config, err := d.getOAuthConfig()
	if err != nil {
		return nil, err
	}

	token, err := d.getToken()
	if err != nil {
		return nil, err
	}

	return config.Client(ctx, token), nil
}

// UploadData uploads the provided data as a JSON file to Google Drive
func (d *DriveService) UploadData(data []byte) error {
	ctx := context.Background()
	client, err := d.getClient(ctx)
	if err != nil {
		return err
	}

	srv, err := drive.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		return fmt.Errorf("unable to retrieve Drive client: %v", err)
	}

	// Check if file exists
	fileId, err := d.findFileID(srv, BackupFileName)
	if err != nil {
		return err
	}

	fileMetadata := &drive.File{
		Name:     BackupFileName,
		MimeType: "application/json",
	}

	media := bytes.NewReader(data)

	if fileId != "" {
		// Update existing file
		_, err = srv.Files.Update(fileId, fileMetadata).Media(media).Do()
		if err != nil {
			return fmt.Errorf("unable to update file: %v", err)
		}
	} else {
		// Create new file
		_, err = srv.Files.Create(fileMetadata).Media(media).Do()
		if err != nil {
			return fmt.Errorf("unable to create file: %v", err)
		}
	}

	return nil
}

// DownloadData downloads the backup file from Google Drive
func (d *DriveService) DownloadData() ([]byte, error) {
	ctx := context.Background()
	client, err := d.getClient(ctx)
	if err != nil {
		return nil, err
	}

	srv, err := drive.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		return nil, fmt.Errorf("unable to retrieve Drive client: %v", err)
	}

	fileId, err := d.findFileID(srv, BackupFileName)
	if err != nil {
		return nil, err
	}
	if fileId == "" {
		return nil, fmt.Errorf("backup file not found")
	}

	resp, err := srv.Files.Get(fileId).Download()
	if err != nil {
		return nil, fmt.Errorf("unable to download file: %v", err)
	}
	defer resp.Body.Close()

	buf := new(bytes.Buffer)
	_, err = buf.ReadFrom(resp.Body)
	if err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

// findFileID finds the ID of a file by name. Returns empty string if not found.
func (d *DriveService) findFileID(srv *drive.Service, name string) (string, error) {
	q := fmt.Sprintf("name = '%s' and trashed = false", name)
	list, err := srv.Files.List().Q(q).Fields("files(id)").Do()
	if err != nil {
		return "", fmt.Errorf("unable to list files: %v", err)
	}

	if len(list.Files) > 0 {
		return list.Files[0].Id, nil
	}
	return "", nil
}

// IsAuthenticated checks if we have a token
func (d *DriveService) IsAuthenticated() bool {
	_, err := d.getToken()
	return err == nil
}

// SaveCredentials saves the Client ID and Secret
func (d *DriveService) SaveCredentials(clientID, clientSecret string) error {
	if err := d.storage.SaveSetting(ClientIDKey, clientID); err != nil {
		return err
	}
	if err := d.storage.SaveSetting(ClientSecretKey, clientSecret); err != nil {
		return err
	}
	return nil
}
