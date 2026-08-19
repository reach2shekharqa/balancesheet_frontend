import { useState } from "react";
import "./App.css";

import AssetsBreakdownChart from "./components/AssetsBreakdownChart";
import AssetsComparisonChart from "./components/AssetsComparisonChart";
import LiabilitiesBreakdownChart from "./components/LiabilitiesBreakdownChart";
import { getValidYears } from "./utils/analyticsData";

const API_BASE_URL = "http://localhost:3000/api";

async function requestAnalytics(documentId, analyticsType) {
    console.log(`[ANALYTICS] Starting ${analyticsType} request`, {
        documentId,
        analyticsType,
    });

    const response = await fetch(
        `${API_BASE_URL}/documents/${documentId}/analytics`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ analyticsType }),
        }
    );

    const result = await response.json();

    console.log(`[ANALYTICS] ${analyticsType} response`, {
        status: response.status,
        ok: response.ok,
        result,
    });

    if (!response.ok) {
        throw new Error(result.error || `${analyticsType} request failed.`);
    }

    return result;
}


function App() {
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState("");
    const [uploading, setUploading] = useState(false);
    const [analyticsData, setAnalyticsData] = useState({
        assets: null,
        liabilities: null,
    });
    const [activeChart, setActiveChart] = useState("comparison");


    function handleFileChange(event) {
        const selectedFile = event.target.files[0];

        setFile(selectedFile || null);
        setMessage("");
        setAnalyticsData({ assets: null, liabilities: null });
        setActiveChart("comparison");
    }

    async function handleUpload() {
        if (!file) {
            setMessage("Please select a PDF first.");
            return;
        }

        setUploading(true);
        setAnalyticsData({ assets: null, liabilities: null });
        setActiveChart("comparison");
        setMessage("Uploading PDF...");

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("userId", "admin");

            const uploadResponse = await fetch("http://localhost:3000/api/documents/upload", {
                method: "POST",
                body: formData,
            });

            const uploadResult = await uploadResponse.json();
            console.log("Upload Result:", uploadResult);
            if (!uploadResponse.ok) {
                throw new Error(uploadResult.error || "Upload failed.");
            }

            const nextDocumentId = uploadResult?.document?.id ?? uploadResult?.id ?? null;

            if (!nextDocumentId) {
                throw new Error("Upload succeeded but no document ID was returned.");
            }

            setMessage("Loading balance sheet analytics...");

            const analyticsResult = await requestAnalytics(
                nextDocumentId,
                "assetsBreakdown"
            );

            const liabilitiesResult = await requestAnalytics(
                nextDocumentId,
                "liabilitiesBreakdown"
            );

            setAnalyticsData({
                assets: analyticsResult,
                liabilities: liabilitiesResult,
            });
            setMessage("Balance sheet analytics loaded successfully.");
        } catch (error) {
            console.error("Upload / analytics error:", error);
            setMessage("Unable to load balance sheet analytics. Please try again.");
        } finally {
            setUploading(false);
        }
    }

    return (
        <div className="app">
            <div className="card">
                <h1>Financial Analyzer</h1>
                <p>Upload a financial PDF to analyze it.</p>

                <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    disabled={uploading}
                />

                {file && (
                    <div className="selected-file">
                        Selected file:
                        <strong>{file.name}</strong>
                    </div>
                )}

                <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                >
                    {uploading ? "Processing..." : "Upload PDF"}
                </button>

                {message && (
                    <div className={`status-banner ${uploading ? "loading" : "info"}`}>
                        {message}
                    </div>
                )}

                {analyticsData.assets && (
                    <div className="analytics analytics-hero">
                        <div className="analytics-hero-copy">
                            <span className="analytics-eyebrow">Balance Sheet Insights</span>
                            <h2>Assets at a glance</h2>
                            <p>Explore the balance sheet one view at a time.</p>
                        </div>

                        <div className="analytics-switcher" role="tablist" aria-label="Financial analytics views">
                            <button
                                className={activeChart === "comparison" ? "is-active" : ""}
                                onClick={() => setActiveChart("comparison")}
                                role="tab"
                                aria-selected={activeChart === "comparison"}
                            >
                                {getValidYears(analyticsData.assets).slice(0, 2).join(" vs ") || "Comparison"}
                            </button>
                            <button
                                className={activeChart === "breakdown" ? "is-active" : ""}
                                onClick={() => setActiveChart("breakdown")}
                                role="tab"
                                aria-selected={activeChart === "breakdown"}
                            >
                                {getValidYears(analyticsData.assets)[0] || "Latest"} Breakdown
                            </button>
                            <button
                                className={activeChart === "liabilities" ? "is-active" : ""}
                                onClick={() => setActiveChart("liabilities")}
                                role="tab"
                                aria-selected={activeChart === "liabilities"}
                            >
                                Liabilities {getValidYears(analyticsData.liabilities)[0] || "Latest"}
                            </button>
                        </div>

                        <div className="analytics-hero-stage">
                            <section className="chart-panel chart-panel-featured">
                                {activeChart === "comparison" ? (
                                    <AssetsComparisonChart
                                        analyticsData={analyticsData.assets}
                                    />
                                ) : activeChart === "breakdown" ? (
                                    <AssetsBreakdownChart
                                        analyticsData={analyticsData.assets}
                                    />
                                ) : (
                                    <LiabilitiesBreakdownChart
                                        analyticsData={analyticsData.liabilities}
                                    />
                                )}
                            </section>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;