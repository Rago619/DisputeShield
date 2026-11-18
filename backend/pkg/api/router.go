package api

import (
	"io/fs"
	"net/http"
	"strings"
)

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// RegisterRoutes sets up all API endpoints and optional static frontend serving.
func (a *API) RegisterRoutes(frontendFS fs.FS) http.Handler {
	mux := http.NewServeMux()

	// API routes
	mux.HandleFunc("/api/health", a.HandleHealth)
	mux.HandleFunc("/api/overview", a.HandleOverview)
	mux.HandleFunc("/api/payments", a.HandlePayments)
	mux.HandleFunc("/api/teams", a.HandleTeams)
	mux.HandleFunc("/api/teams/", a.HandleTeamDetail)
	mux.HandleFunc("/api/reasons", a.HandleReasons)
	mux.HandleFunc("/api/whatif", a.HandleWhatIf)
	mux.HandleFunc("/api/upload/step1", a.HandleUploadStep1)
	mux.HandleFunc("/api/upload/step2", a.HandleUploadStep2)
	mux.HandleFunc("/api/reset", a.HandleReset)
	mux.HandleFunc("/api/export/payments", a.HandleExportPayments)
	mux.HandleFunc("/api/export/disputes", a.HandleExportDisputes)
	mux.HandleFunc("/api/export/whatif", a.HandleExportWhatIf)
	mux.HandleFunc("/api/sample/", a.HandleSampleFile)

	// Static frontend file server with SPA index.html fallback
	if frontendFS != nil {
		fileServer := http.FileServer(http.FS(frontendFS))
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			if strings.HasPrefix(r.URL.Path, "/api/") {
				http.NotFound(w, r)
				return
			}

			// Check if file exists in frontendFS
			cleanPath := strings.TrimPrefix(r.URL.Path, "/")
			if cleanPath == "" {
				cleanPath = "index.html"
			}

			f, err := frontendFS.Open(cleanPath)
			if err == nil {
				_ = f.Close()
				fileServer.ServeHTTP(w, r)
				return
			}

			// SPA fallback: serve index.html for unknown routes
			indexData, err := fs.ReadFile(frontendFS, "index.html")
			if err == nil {
				w.Header().Set("Content-Type", "text/html; charset=utf-8")
				w.WriteHeader(http.StatusOK)
				_, _ = w.Write(indexData)
				return
			}

			http.NotFound(w, r)
		})
	} else {
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			if strings.HasPrefix(r.URL.Path, "/api/") {
				http.NotFound(w, r)
				return
			}
			w.Header().Set("Content-Type", "text/plain")
			_, _ = w.Write([]byte("DisputeShield Backend API is running. Point frontend to /api."))
		})
	}

	return corsMiddleware(mux)
}
