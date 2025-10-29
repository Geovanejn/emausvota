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
    const year = yearMatch ? yearMatch[2] : new Date().getFullYear().toString();

    useImperativeHandle(ref, () => ({
      exportImage: async () => {
        if (!imageRef.current) return;

        try {
          const canvas = await html2canvas(imageRef.current, {
            backgroundColor: "#E5E5E5",
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
          backgroundColor: "#FFFFFF",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
        }}
      >
        {/* Yellow tag on top - ATTACHED to card, not floating */}
        <div
          style={{
            backgroundColor: "#FFD700",
            borderRadius: "20px 20px 0 0",
            padding: is916 ? "12px 24px" : "10px 20px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: is916 ? "22px" : "18px",
              fontWeight: "700",
              fontStyle: "italic",
              color: "#000000",
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            {winner.positionName}
          </p>
        </div>

        {/* Card content with photo and text */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: is916 ? "20px" : "16px",
            padding: is916 ? "24px" : "20px",
          }}
        >
          {/* Photo on the left - MUCH BIGGER */}
          <div
            style={{
              width: is916 ? "140px" : "120px",
              height: is916 ? "140px" : "120px",
              borderRadius: "50%",
              backgroundColor: "#E8E8E8",
              overflow: "hidden",
              flexShrink: 0,
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
                  fontSize: is916 ? "42px" : "36px",
                  fontWeight: "700",
                  color: "#FFA500",
                  backgroundColor: "#FFF7E6",
                }}
              >
                {winner.candidateName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Text content on the right */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: is916 ? "26px" : "22px",
                fontWeight: "700",
                color: "#000000",
                marginBottom: "8px",
                textTransform: "uppercase",
                lineHeight: "1.2",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {winner.candidateName}
            </p>
            <p
              style={{
                fontSize: is916 ? "16px" : "14px",
                color: "#000000",
                fontWeight: "400",
              }}
            >
              {winner.voteCount} votos • Eleito no {getScrutinyLabel(winner.wonAtScrutiny)} Escrutínio
            </p>
          </div>
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
            backgroundColor: "#E5E5E5",
            padding: is916 ? "60px 40px 50px 40px" : "50px 40px 40px 40px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Background watermark pattern - VERY SUBTLE */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.015,
              fontSize: is916 ? "200px" : "170px",
              fontWeight: "900",
              color: "#000000",
              display: "flex",
              flexWrap: "wrap",
              alignContent: "flex-start",
              gap: is916 ? "60px" : "50px",
              padding: is916 ? "120px 30px" : "100px 20px",
              transform: "rotate(-12deg)",
              zIndex: 0,
            }}
          >
            {Array.from({ length: 25 }).map((_, i) => (
              <span key={i} style={{ whiteSpace: "nowrap" }}>ELEIÇÃO</span>
            ))}
          </div>

          {/* Content */}
          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Title */}
            <h1
              style={{
                fontSize: is916 ? "86px" : "72px",
                fontWeight: "800",
                color: "#000000",
                textAlign: "center",
                marginBottom: is916 ? "60px" : "45px",
                lineHeight: "1",
                letterSpacing: "-1.5px",
              }}
            >
              <span style={{ fontWeight: "800" }}>ELEIÇÃO</span>{" "}
              <span
                style={{
                  fontWeight: "800",
                  color: "transparent",
                  WebkitTextStroke: "3px #000000",
                }}
              >
                {year}
              </span>
            </h1>

            {/* Winners Grid - 2x2 + 1 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: is916 ? "32px 20px" : "26px 18px",
                maxWidth: is916 ? "920px" : "100%",
                margin: "0 auto",
              }}
            >
              {/* Row 1: Presidente, Vice-Presidente */}
              {sortedWinners[0] && <WinnerCard winner={sortedWinners[0]} />}
              {sortedWinners[1] && <WinnerCard winner={sortedWinners[1]} />}
              
              {/* Row 2: 1º Secretário, 2º Secretário */}
              {sortedWinners[2] && <WinnerCard winner={sortedWinners[2]} />}
              {sortedWinners[3] && <WinnerCard winner={sortedWinners[3]} />}
              
              {/* Row 3: Tesoureiro - centered, spans 2 columns */}
              {sortedWinners[4] && (
                <div style={{ gridColumn: "1 / -1", maxWidth: is916 ? "460px" : "420px", margin: "0 auto", width: "100%" }}>
                  <WinnerCard winner={sortedWinners[4]} />
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Scripture */}
            <div
              style={{
                textAlign: "center",
                marginBottom: is916 ? "40px" : "32px",
              }}
            >
              <p
                style={{
                  fontSize: is916 ? "18px" : "15px",
                  fontStyle: "italic",
                  color: "#000000",
                  lineHeight: "1.5",
                  marginBottom: "0",
                  fontWeight: "400",
                }}
              >
                Porque de Deus somos cooperadores; lavoura de Deus,
                <br />
                edifício de Deus sois vós. - 1 coríntios 3:9
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
                alt="emaús"
                style={{
                  height: is916 ? "80px" : "70px",
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
