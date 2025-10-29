import { useRef, forwardRef, useImperativeHandle } from "react";
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
            backgroundColor: "#FFFFFF",
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
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          padding: is916 ? "32px 24px" : "28px 20px",
          boxShadow: "0 8px 24px rgba(255, 165, 0, 0.15)",
          border: "2px solid #FFF7E6",
          gap: is916 ? "20px" : "16px",
        }}
      >
        {/* Photo */}
        <div
          style={{
            width: is916 ? "120px" : "100px",
            height: is916 ? "120px" : "100px",
            borderRadius: "50%",
            backgroundColor: "#FFF7E6",
            overflow: "hidden",
            border: "4px solid #FFA500",
            boxShadow: "0 4px 12px rgba(255, 165, 0, 0.3)",
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
                color: "#FFA500",
                backgroundColor: "#FFF7E6",
              }}
            >
              {winner.candidateName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* Position badge */}
        <div
          style={{
            backgroundColor: "#FFA500",
            color: "#FFFFFF",
            padding: is916 ? "8px 24px" : "6px 20px",
            borderRadius: "20px",
            fontSize: is916 ? "16px" : "14px",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {winner.positionName}
        </div>

        {/* Name */}
        <h3
          style={{
            fontSize: is916 ? "24px" : "20px",
            fontWeight: "800",
            color: "#1A1A1A",
            margin: 0,
            textAlign: "center",
            textTransform: "uppercase",
            lineHeight: "1.2",
          }}
        >
          {winner.candidateName}
        </h3>

        {/* Vote details */}
        <p
          style={{
            fontSize: is916 ? "14px" : "12px",
            color: "#666666",
            margin: 0,
            textAlign: "center",
            fontWeight: "500",
          }}
        >
          {winner.voteCount} votos • Eleito no {getScrutinyLabel(winner.wonAtScrutiny)} Escrutínio
        </p>
      </div>
    );

    return (
      <div className="fixed -left-[9999px] -top-[9999px]">
        <div
          ref={imageRef}
          style={{
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
            backgroundColor: "#FFFFFF",
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

          {/* Winners Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: is916 ? "1fr 1fr" : "1fr 1fr",
              gap: is916 ? "24px" : "20px",
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
              borderTop: "2px solid #FFF7E6",
            }}
          >
            {/* Scripture */}
            <p
              style={{
                fontSize: is916 ? "16px" : "14px",
                color: "#666666",
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

            {/* Logo */}
            <img
              src={logoUrl}
              alt="UMP Emaús"
              style={{
                height: is916 ? "60px" : "50px",
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
