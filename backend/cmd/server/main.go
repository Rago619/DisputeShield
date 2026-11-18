package main

import (
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"disputeshield/pkg/api"
	"disputeshield/pkg/scoring"
	"disputeshield/pkg/store"
)

func findDirectory(candidates []string) string {
	for _, c := range candidates {
		if stat, err := os.Stat(c); err == nil && stat.IsDir() {
			abs, err := filepath.Abs(c)
			if err == nil {
				return abs
			}
			return c
		}
	}
	return ""
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// 1. Locate Historical Data directory
	historicalDir := os.Getenv("HISTORICAL_DIR")
	if historicalDir == "" {
		historicalDir = findDirectory([]string{
			"./data/historical",
			"../data/historical",
			"../../data/historical",
			"/app/data/historical",
		})
	}
	if historicalDir == "" {
		log.Fatalf("Could not locate historical data directory. Please set HISTORICAL_DIR.")
	}
	log.Printf("[DisputeShield] Using Historical Data from: %s", historicalDir)

	// 2. Locate Sample Upload directory
	sampleUploadDir := os.Getenv("SAMPLE_UPLOAD_DIR")
	if sampleUploadDir == "" {
		sampleUploadDir = findDirectory([]string{
			"./data/sample_upload",
			"../data/sample_upload",
			"../../data/sample_upload",
			"/app/data/sample_upload",
		})
	}
	log.Printf("[DisputeShield] Using Sample Upload files from: %s", sampleUploadDir)

	// 3. Initialize Scoring Engine
	engine, err := scoring.NewEngine()
	if err != nil {
		log.Fatalf("Failed to initialize scoring engine: %v", err)
	}
	log.Printf("[DisputeShield] Scoring Engine initialized (Model Version: %s)", engine.Config.ModelVersion)

	// 4. Initialize Data Store
	appStore, err := store.NewStore(historicalDir, engine)
	if err != nil {
		log.Fatalf("Failed to initialize store: %v", err)
	}
	kpis := appStore.GetOverviewKPIs()
	log.Printf("[DisputeShield] Store loaded %d payments, %d disputes across 200 teams", kpis.TotalPayments, kpis.TotalDisputes)

	// 5. Check for compiled frontend distribution
	frontendDir := os.Getenv("FRONTEND_DIST")
	if frontendDir == "" {
		frontendDir = findDirectory([]string{
			"./frontend/dist",
			"../frontend/dist",
			"../../frontend/dist",
			"./dist",
			"/app/frontend/dist",
		})
	}

	var frontendFS fs.FS
	if frontendDir != "" {
		log.Printf("[DisputeShield] Serving React Frontend from: %s", frontendDir)
		frontendFS = os.DirFS(frontendDir)
	} else {
		log.Printf("[DisputeShield] Notice: No compiled frontend directory found. API endpoints only.")
	}

	// 6. Router and Server
	apiHandler := api.NewAPI(appStore, sampleUploadDir)
	router := apiHandler.RegisterRoutes(frontendFS)

	addr := fmt.Sprintf(":%s", port)
	log.Printf("[DisputeShield] Server listening on %s (ready for Render and local development)", addr)
	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("Server exited with error: %v", err)
	}
}
