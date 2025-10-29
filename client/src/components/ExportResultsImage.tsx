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
      : { width: 1080, height: 1350 };  // 4:5 ratio

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

    // Style configuration per aspect ratio
    const styles = is916 ? {
      container: { padding: "60px 40px 50px 40px" },
      title: { fontSize: "64px", marginBottom: "50px", letterSpacing: "-0.5px" },
      winnersContainer: { maxWidth: "780px", margin: "0 auto", gap: "24px" },
      card: { 
        padding: "24px", 
        gap: "24px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
        borderRadius: "12px"
      },
      photo: { width: "100px", height: "100px" },
      positionFont: "20px",
      nameFont: "32px",
      detailsFont: "16px",
      scripture: { 
        fontSize: "18px", 
        padding: "32px 28px", 
        marginBottom: "36px",
        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.06)",
        borderRadius: "12px"
      },
      scriptureRef: "15px",
      logo: "220px",
    } : {
      container: { padding: "50px 40px 40px 40px" },
      title: { fontSize: "56px", marginBottom: "36px", letterSpacing: "-0.5px" },
      winnersContainer: { gap: "20px" },
      card: { 
        padding: "20px 24px", 
        gap: "20px",
        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
        borderRadius: "12px"
      },
      photo: { width: "80px", height: "80px" },
      positionFont: "18px",
      nameFont: "26px",
      detailsFont: "14px",
      scripture: { 
        fontSize: "16px", 
        padding: "24px 20px", 
        marginBottom: "28px",
        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.06)",
        borderRadius: "12px"
      },
      scriptureRef: "13px",
      logo: "180px",
    };

    const WinnerCard = ({ winner }: { winner: Winner }) => (
      <div
        key={winner.positionId}
        style={{
          display: "flex",
          alignItems: "center",
          gap: styles.card.gap,
          padding: styles.card.padding,
          borderLeft: "5px solid #FFA500",
          backgroundColor: "#F9F9F9",
          borderRadius: styles.card.borderRadius,
          boxShadow: styles.card.boxShadow,
        }}
      >
        {/* Photo */}
        <div
          style={{
            width: styles.photo.width,
            height: styles.photo.height,
            borderRadius: "50%",
            backgroundColor: "#E8E8E8",
            overflow: "hidden",
            flexShrink: 0,
            border: "3px solid #FFFFFF",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
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
                fontSize: is916 ? "36px" : "28px",
                fontWeight: "700",
                color: "#FFA500",
                backgroundColor: "#FFF7E6",
              }}
            >
              {winner.candidateName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: styles.positionFont,
              fontWeight: "700",
              color: "#FFA500",
              marginBottom: "6px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {winner.positionName}
          </p>
          <p
            style={{
              fontSize: styles.nameFont,
              fontWeight: "700",
              color: "#333333",
              marginBottom: "8px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              lineHeight: "1.2",
            }}
          >
            {winner.candidateName}
          </p>
          <p
            style={{
              fontSize: styles.detailsFont,
              color: "#666666",
              fontWeight: "500",
            }}
          >
            {winner.voteCount} votos • Eleito no {getScrutinyLabel(winner.wonAtScrutiny)} Escrutínio
          </p>
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
            backgroundColor: "#FFFFFF",
            padding: styles.container.padding,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Header */}
          <div>
            <h1
              style={{
                fontSize: styles.title.fontSize,
                fontWeight: "800",
                color: "#333333",
                textAlign: "center",
                marginBottom: styles.title.marginBottom,
                lineHeight: "1.1",
                letterSpacing: styles.title.letterSpacing,
              }}
            >
              {electionTitle}
            </h1>

            {/* Winners List */}
            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              gap: styles.winnersContainer.gap,
              ...(is916 ? {
                maxWidth: styles.winnersContainer.maxWidth,
                margin: styles.winnersContainer.margin,
              } : {})
            }}>
              {sortedWinners.map((winner) => (
                <WinnerCard key={winner.positionId} winner={winner} />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div>
            {/* Scripture */}
            <div
              style={{
                textAlign: "center",
                padding: styles.scripture.padding,
                backgroundColor: "#F9F9F9",
                borderRadius: styles.scripture.borderRadius,
                marginBottom: styles.scripture.marginBottom,
                boxShadow: styles.scripture.boxShadow,
                borderLeft: "4px solid #FFD166",
              }}
            >
              <p
                style={{
                  fontSize: styles.scripture.fontSize,
                  fontStyle: "italic",
                  color: "#555555",
                  lineHeight: "1.6",
                  marginBottom: "8px",
                  fontWeight: "500",
                }}
              >
                "Porque de Deus somos cooperadores; lavoura de Deus, edifício de Deus sois vós."
              </p>
              <p
                style={{
                  fontSize: styles.scriptureRef,
                  color: "#FFA500",
                  fontWeight: "700",
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
                  height: styles.logo,
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
