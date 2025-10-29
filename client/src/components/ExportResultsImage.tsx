import { useRef, forwardRef, useImperativeHandle, useState } from "react";
import html2canvas from "html2canvas";
import logoUrl from "@assets/EMAÚS_20251029_101216_0000_1761743724321.png";

interface Winner {
  positionId: number;
  positionName: string;
  candidateName: string;
  photoUrl?: string;
  voteCount: number;
  wonAtScrutiny: number;
}

export type AspectRatio = "9:16" | "5:4";

interface ExportResultsImageProps {
  electionTitle: string;
  winners: Winner[];
  aspectRatio: AspectRatio;
}

export interface ExportResultsImageHandle {
  exportImage: () => Promise<void>;
}

const ExportResultsImage = forwardRef<ExportResultsImageHandle, ExportResultsImageProps>(
  ({ electionTitle, winners, aspectRatio }, ref) => {
    const imageRef = useRef<HTMLDivElement>(null);

    // Calculate dimensions based on aspect ratio
    const dimensions = aspectRatio === "9:16" 
      ? { width: 1080, height: 1920 }  // Stories/Vertical
      : { width: 1080, height: 864 };  // Feed/Square-ish

    const positionOrder = [
      "Presidente",
      "Vice-Presidente",
      "1º Secretário",
      "2º Secretário",
      "Tesoureiro"
    ];

    const sortedWinners = [...winners].sort((a, b) => {
      const aIndex = positionOrder.indexOf(a.positionName);
      const bIndex = positionOrder.indexOf(b.positionName);
      return aIndex - bIndex;
    });

    const getScrutinyLabel = (scrutiny: number) => {
      const ordinals = ["1º", "2º", "3º"];
      return ordinals[scrutiny - 1] || `${scrutiny}º`;
    };

    useImperativeHandle(ref, () => ({
      exportImage: async () => {
        if (!imageRef.current) return;

        try {
          const canvas = await html2canvas(imageRef.current, {
            backgroundColor: "#ffffff",
            scale: 2,
            logging: false,
            width: dimensions.width,
            height: dimensions.height,
          });

          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `${electionTitle.replace(/\s+/g, '_')}_Resultados.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }
          });
        } catch (error) {
          console.error("Error exporting image:", error);
        }
      },
    }));

    return (
      <div className="fixed -left-[9999px] -top-[9999px]">
        <div
          ref={imageRef}
          style={{
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
            backgroundColor: "#ffffff",
            padding: "60px 50px 40px 50px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Header */}
          <div>
            <h1
              style={{
                fontSize: "56px",
                fontWeight: "bold",
                color: "#1a1a1a",
                textAlign: "center",
                marginBottom: "60px",
                lineHeight: "1.2",
              }}
            >
              {electionTitle}
            </h1>

            {/* Winners List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
              {sortedWinners.map((winner) => (
                <div
                  key={winner.positionId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "24px",
                    padding: "20px",
                    borderLeft: "6px solid #FFA500",
                    backgroundColor: "#f8f8f8",
                    borderRadius: "8px",
                  }}
                >
                  {/* Photo */}
                  <div
                    style={{
                      width: "100px",
                      height: "100px",
                      borderRadius: "50%",
                      backgroundColor: "#e0e0e0",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {winner.photoUrl ? (
                      <img
                        src={winner.photoUrl}
                        alt={winner.candidateName}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "36px",
                          fontWeight: "bold",
                          color: "#FFA500",
                        }}
                      >
                        {winner.candidateName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontSize: "24px",
                        fontWeight: "600",
                        color: "#FFA500",
                        marginBottom: "4px",
                      }}
                    >
                      {winner.positionName}
                    </p>
                    <p
                      style={{
                        fontSize: "32px",
                        fontWeight: "bold",
                        color: "#1a1a1a",
                        marginBottom: "8px",
                      }}
                    >
                      {winner.candidateName}
                    </p>
                    <p
                      style={{
                        fontSize: "18px",
                        color: "#666666",
                      }}
                    >
                      {winner.voteCount} votos • Eleito no {getScrutinyLabel(winner.wonAtScrutiny)} Escrutínio
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div>
            {/* Scripture */}
            <div
              style={{
                textAlign: "center",
                padding: "30px 20px",
                backgroundColor: "#f5f5f5",
                borderRadius: "8px",
                marginBottom: "30px",
              }}
            >
              <p
                style={{
                  fontSize: "20px",
                  fontStyle: "italic",
                  color: "#333333",
                  lineHeight: "1.6",
                  marginBottom: "8px",
                }}
              >
                "Porque de Deus somos cooperadores; lavoura de Deus, edifício de Deus sois vós."
              </p>
              <p
                style={{
                  fontSize: "16px",
                  color: "#666666",
                  fontWeight: "600",
                }}
              >
                1 Coríntios 3:9
              </p>
            </div>

            {/* Logo */}
            <div style={{ 
              textAlign: "center",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}>
              <img
                src={logoUrl}
                alt="UMP Emaús"
                style={{
                  height: "150px",
                  maxWidth: "100%",
                  objectFit: "contain",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ExportResultsImage.displayName = "ExportResultsImage";

export default ExportResultsImage;
