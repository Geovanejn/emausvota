import { useRef, forwardRef, useImperativeHandle } from "react";
import html2canvas from "html2canvas";
import backgroundUrl from "@assets/fundo_1761781968067.png";
import logoUrl from "@assets/2_1761782065893.png";

interface Winner {
  positionId: number;
  positionName: string;
  candidateName: string;
  photoUrl?: string;
  voteCount: number;
  wonAtScrutiny: number;
}

export type AspectRatio = "9:16" | "4:5";

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

    const dimensions = aspectRatio === "9:16" 
      ? { width: 1080, height: 1920 }
      : { width: 1080, height: 1350 };

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

    const yearMatch = electionTitle.match(/(\d{4})\/(\d{4})/);
    const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();

    useImperativeHandle(ref, () => ({
      exportImage: async () => {
        if (!imageRef.current) return;

        try {
          const canvas = await html2canvas(imageRef.current, {
            backgroundColor: null,
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
              const formatLabel = aspectRatio === "9:16" ? "Stories" : "Feed";
              link.download = `${electionTitle.replace(/\s+/g, '_')}_${formatLabel}.png`;
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

    const is916 = aspectRatio === "9:16";

    const WinnerCard = ({ winner }: { winner: Winner }) => (
      <div
        style={{
          position: "relative",
          backgroundColor: "#FFFFFF",
          borderRadius: "24px",
          overflow: "visible",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
        }}
      >
        {/* Yellow header with position name */}
        <div
          style={{
            backgroundColor: "#FFD84B",
            padding: is916 ? "16px 20px" : "14px 18px",
            borderRadius: "24px 24px 0 0",
            textAlign: "center",
          }}
        >
          <h3
            style={{
              fontSize: is916 ? "22px" : "20px",
              fontWeight: "800",
              fontStyle: "italic",
              color: "#1A1A1A",
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {winner.positionName}
          </h3>
        </div>

        {/* White body with name and vote details */}
        <div
          style={{
            padding: is916 ? "24px 20px 70px 20px" : "20px 18px 60px 18px",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontSize: is916 ? "26px" : "22px",
              fontWeight: "800",
              color: "#1A1A1A",
              margin: 0,
              marginBottom: is916 ? "12px" : "10px",
              textTransform: "uppercase",
              lineHeight: "1.2",
            }}
          >
            {winner.candidateName}
          </h2>
          <p
            style={{
              fontSize: is916 ? "16px" : "14px",
              color: "#4A4A4A",
              margin: 0,
              fontWeight: "500",
            }}
          >
            {winner.voteCount} votos • Eleito no {getScrutinyLabel(winner.wonAtScrutiny)} Escrutínio
          </p>
        </div>

        {/* Photo overlapping bottom of card */}
        <div
          style={{
            position: "absolute",
            bottom: is916 ? "-40px" : "-35px",
            left: "50%",
            transform: "translateX(-50%)",
            width: is916 ? "120px" : "100px",
            height: is916 ? "120px" : "100px",
            borderRadius: "50%",
            backgroundColor: "#F5F5F5",
            overflow: "hidden",
            border: "4px solid #FFFFFF",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
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
                fontSize: is916 ? "40px" : "34px",
                fontWeight: "800",
                color: "#999999",
                backgroundColor: "#F5F5F5",
              }}
            >
              {winner.candidateName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    );

    return (
      <div className="fixed -left-[9999px] -top-[9999px]">
        <div
          ref={imageRef}
          style={{
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
            backgroundImage: `url(${backgroundUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            padding: is916 ? "60px 50px" : "50px 40px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif",
            display: "flex",
            flexDirection: "column",
            gap: is916 ? "50px" : "40px",
          }}
        >
          {/* Header with gradient background */}
          <div
            style={{
              background: "linear-gradient(135deg, #FFA500 0%, #FFD700 100%)",
              borderRadius: "20px",
              padding: is916 ? "40px 30px" : "32px 24px",
              textAlign: "center",
              boxShadow: "0 8px 24px rgba(255, 165, 0, 0.3)",
            }}
          >
            <h1
              style={{
                fontSize: is916 ? "56px" : "48px",
                fontWeight: "900",
                color: "#FFFFFF",
                margin: 0,
                marginBottom: "12px",
                textTransform: "uppercase",
                letterSpacing: "2px",
                textShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
              }}
            >
              Eleição {year}
            </h1>
            <p
              style={{
                fontSize: is916 ? "18px" : "16px",
                color: "#FFFFFF",
                margin: 0,
                fontWeight: "600",
                opacity: 0.95,
              }}
            >
              UMP Emaús - Resultados Oficiais
            </p>
          </div>

          {/* Winners Grid with extra bottom margin for overlapping photos */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: is916 ? "1fr 1fr" : "1fr 1fr",
              gap: is916 ? "70px 24px" : "60px 20px",
              flex: 1,
            }}
          >
            {sortedWinners.slice(0, 4).map((winner) => (
              <WinnerCard key={winner.positionId} winner={winner} />
            ))}
            
            {/* Tesoureiro - centered full width */}
            {sortedWinners[4] && (
              <div style={{ gridColumn: "1 / -1", maxWidth: "480px", margin: "0 auto", width: "100%" }}>
                <WinnerCard winner={sortedWinners[4]} />
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: is916 ? "24px" : "20px",
              paddingTop: is916 ? "20px" : "16px",
            }}
          >
            {/* Scripture */}
            <p
              style={{
                fontSize: is916 ? "16px" : "14px",
                color: "#4A4A4A",
                textAlign: "center",
                fontStyle: "italic",
                margin: 0,
                maxWidth: "800px",
                lineHeight: "1.6",
              }}
            >
              "Porque de Deus somos cooperadores; lavoura de Deus, edifício de Deus sois vós."
              <br />
              <span style={{ fontWeight: "600", color: "#FFA500" }}>1 Coríntios 3:9</span>
            </p>

            {/* Logo - BIGGER */}
            <img
              src={logoUrl}
              alt="UMP Emaús"
              style={{
                height: is916 ? "100px" : "80px",
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      </div>
    );
  }
);

ExportResultsImage.displayName = "ExportResultsImage";

export default ExportResultsImage;
