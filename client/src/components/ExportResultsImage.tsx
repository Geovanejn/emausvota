import { useRef, forwardRef, useImperativeHandle } from "react";
import html2canvas from "html2canvas";
import backgroundUrl from "@assets/Fundo Layout stories_1761783891823.png";
import logoUrl from "@assets/EMAÚS v3 sem fundo_1761784452767.png";

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
          maxWidth: "480px",
          width: "100%",
          margin: "0 auto",
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
            padding: is916 ? "24px 20px 80px 20px" : "20px 18px 70px 18px",
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
            bottom: is916 ? "-50px" : "-45px",
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
            paddingTop: "180px",
            paddingLeft: is916 ? "50px" : "40px",
            paddingRight: is916 ? "50px" : "40px",
            paddingBottom: "80px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Title without background - outline style with hollow year */}
          <div
            style={{
              textAlign: "center",
              padding: is916 ? "20px 0" : "16px 0",
              marginBottom: "180px",
            }}
          >
            <h1
              style={{
                fontSize: is916 ? "110px" : "90px",
                fontWeight: "900",
                color: "#1A1A1A",
                margin: 0,
                textTransform: "uppercase",
                letterSpacing: "4px",
                textShadow: "2px 2px 0px rgba(0, 0, 0, 0.1)",
              }}
            >
              ELEIÇÃO{" "}
              <span
                style={{
                  color: "transparent",
                  WebkitTextStroke: "3px #1A1A1A",
                  fontWeight: "900",
                }}
              >
                {year}
              </span>
            </h1>
          </div>

          {/* Winners Grid - first 4 cards in 2x2 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "80px",
              marginBottom: "80px",
            }}
          >
            {sortedWinners.slice(0, 4).map((winner) => (
              <WinnerCard key={winner.positionId} winner={winner} />
            ))}
          </div>

          {/* Fifth card (Tesoureiro) - centered */}
          {sortedWinners[4] && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "180px",
              }}
            >
              <WinnerCard winner={sortedWinners[4]} />
            </div>
          )}

          {/* Scripture */}
          <div
            style={{
              marginBottom: "180px",
            }}
          >
            <p
              style={{
                fontSize: is916 ? "26px" : "22px",
                color: "#4A4A4A",
                textAlign: "center",
                fontStyle: "italic",
                margin: 0,
                lineHeight: "1.6",
              }}
            >
              "Porque de Deus somos cooperadores; lavoura de Deus, edifício de Deus sois vós."
              <br />
              <span style={{ fontWeight: "600", color: "#FFA500" }}>1 Coríntios 3:9</span>
            </p>
          </div>

          {/* Logo - 300px x 300px */}
          <div>
            <img
              src={logoUrl}
              alt="UMP Emaús"
              style={{
                width: "300px",
                height: "300px",
                objectFit: "contain",
                display: "block",
                margin: "0 auto",
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
