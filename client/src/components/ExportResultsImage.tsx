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

    const dimensions = aspectRatio === "9:16" 
      ? { width: 1080, height: 1920 }
      : { width: 1080, height: 864 };

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
      container: { padding: "60px 50px 50px 50px" },
      title: { fontSize: "56px", marginBottom: "50px" },
      winnersContainer: { maxWidth: "760px", margin: "0 auto", gap: "32px" },
      card: { padding: "16px", gap: "20px" },
      photo: { width: "90px", height: "90px" },
      positionFont: "22px",
      nameFont: "30px",
      detailsFont: "17px",
      scripture: { fontSize: "20px", padding: "28px 20px", marginBottom: "32px" },
      scriptureRef: "16px",
      logo: "200px",
    } : {
      container: { padding: "40px 40px 32px 40px" },
      title: { fontSize: "48px", marginBottom: "32px" },
      winnersContainer: { gap: "24px" },
      card: { padding: "14px", gap: "16px" },
      photo: { width: "70px", height: "70px" },
      positionFont: "18px",
      nameFont: "24px",
      detailsFont: "14px",
      scripture: { fontSize: "16px", padding: "20px 16px", marginBottom: "24px" },
      scriptureRef: "13px",
      logo: "160px",
    };

    const WinnerCard = ({ winner, index }: { winner: Winner; index: number }) => (
      <div
        key={winner.positionId}
        style={{
          display: "flex",
          alignItems: "center",
          gap: styles.card.gap,
          padding: styles.card.padding,
          borderLeft: "6px solid #FFA500",
          backgroundColor: "#f8f8f8",
          borderRadius: "8px",
          gridColumn: !is916 && index === 4 ? "1 / -1" : undefined,
          maxWidth: !is916 && index === 4 ? "420px" : undefined,
          margin: !is916 && index === 4 ? "0 auto" : undefined,
        }}
      >
        {/* Photo */}
        <div
          style={{
            width: styles.photo.width,
            height: styles.photo.height,
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
                fontSize: is916 ? "32px" : "26px",
                fontWeight: "bold",
                color: "#FFA500",
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
              fontWeight: "600",
              color: "#FFA500",
              marginBottom: "3px",
            }}
          >
            {winner.positionName}
          </p>
          <p
            style={{
              fontSize: styles.nameFont,
              fontWeight: "bold",
              color: "#1a1a1a",
              marginBottom: "6px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {winner.candidateName}
          </p>
          <p
            style={{
              fontSize: styles.detailsFont,
              color: "#666666",
            }}
          >
            {winner.voteCount} votos • {getScrutinyLabel(winner.wonAtScrutiny)} Escrutínio
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
            backgroundColor: "#ffffff",
            padding: styles.container.padding,
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
                fontSize: styles.title.fontSize,
                fontWeight: "bold",
                color: "#1a1a1a",
                textAlign: "center",
                marginBottom: styles.title.marginBottom,
                lineHeight: "1.2",
              }}
            >
              {electionTitle}
            </h1>

            {/* Winners List */}
            {is916 ? (
              <div style={{ 
                display: "flex", 
                flexDirection: "column", 
                gap: styles.winnersContainer.gap,
                maxWidth: styles.winnersContainer.maxWidth,
                margin: styles.winnersContainer.margin,
              }}>
                {sortedWinners.map((winner, index) => (
                  <WinnerCard key={winner.positionId} winner={winner} index={index} />
                ))}
              </div>
            ) : (
              <div style={{ 
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: styles.winnersContainer.gap,
              }}>
                {sortedWinners.map((winner, index) => (
                  <WinnerCard key={winner.positionId} winner={winner} index={index} />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div>
            {/* Scripture */}
            <div
              style={{
                textAlign: "center",
                padding: styles.scripture.padding,
                backgroundColor: "#f5f5f5",
                borderRadius: "8px",
                marginBottom: styles.scripture.marginBottom,
              }}
            >
              <p
                style={{
                  fontSize: styles.scripture.fontSize,
                  fontStyle: "italic",
                  color: "#333333",
                  lineHeight: "1.5",
                  marginBottom: "6px",
                }}
              >
                "Porque de Deus somos cooperadores; lavoura de Deus, edifício de Deus sois vós."
              </p>
              <p
                style={{
                  fontSize: styles.scriptureRef,
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
