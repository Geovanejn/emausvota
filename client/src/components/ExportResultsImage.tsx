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
            backgroundColor: "#F9F9F9",
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

    // Corrected specs based on user feedback analysis
    const specs = is916 ? {
      cardWidth: 440,
      cardHeight: 160,
      headerHeight: 50,
      photoSize: 110,
      photoOffsetRight: 30,
      photoOffsetBottom: -30,
      titleSize: 110,
      titleY: 230,
      letterSpacing: 20,
      cargoSize: 26,
      nameSize: 22,
      voteSize: 18,
      verseSize: 22,
      logoWidth: 270,
      logoHeight: 90,
      positions: [
        { x: 150, y: 530 },   // Presidente
        { x: 590, y: 530 },   // Vice
        { x: 150, y: 790 },   // 1º Sec (was 760, now 790 for 260px spacing)
        { x: 590, y: 790 },   // 2º Sec
        { x: 370, y: 1070 },  // Tesoureiro (was 1010, now 1070)
      ],
      verseY: 1620,
      logoY: 1750,
    } : {
      cardWidth: 420,
      cardHeight: 150,
      headerHeight: 45,
      photoSize: 100,
      photoOffsetRight: 25,
      photoOffsetBottom: -25,
      titleSize: 100,
      titleY: 160,
      letterSpacing: 15,
      cargoSize: 24,
      nameSize: 20,
      voteSize: 16,
      verseSize: 20,
      logoWidth: 240,
      logoHeight: 80,
      positions: [
        { x: 160, y: 440 },   // Presidente
        { x: 600, y: 440 },   // Vice
        { x: 160, y: 660 },   // 1º Sec
        { x: 600, y: 660 },   // 2º Sec
        { x: 380, y: 870 },   // Tesoureiro
      ],
      verseY: 1170,
      logoY: 1240,
    };

    const WinnerCard = ({ winner, index }: { winner: Winner; index: number }) => {
      const pos = specs.positions[index];
      
      return (
        <div
          style={{
            position: "absolute",
            left: `${pos.x}px`,
            top: `${pos.y}px`,
            width: `${specs.cardWidth}px`,
            height: `${specs.cardHeight}px`,
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#FFFFFF",
            borderRadius: "20px",
            overflow: "visible",
            boxShadow: "0 3px 6px rgba(0, 0, 0, 0.1)",
          }}
        >
          {/* Yellow header - integrated at top */}
          <div
            style={{
              height: `${specs.headerHeight}px`,
              backgroundColor: "#FFD84B",
              borderRadius: "20px 20px 0 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 16px",
            }}
          >
            <p
              style={{
                fontSize: `${specs.cargoSize}px`,
                fontWeight: "600",
                fontStyle: "italic",
                color: "#1C1C1C",
                margin: 0,
                textTransform: "uppercase",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              {winner.positionName}
            </p>
          </div>

          {/* Card body with text */}
          <div
            style={{
              flex: 1,
              padding: "20px 20px 20px 20px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <p
              style={{
                fontSize: `${specs.nameSize}px`,
                fontWeight: "700",
                color: "#1C1C1C",
                marginBottom: "6px",
                textTransform: "uppercase",
                lineHeight: "1.2",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              {winner.candidateName}
            </p>
            <p
              style={{
                fontSize: `${specs.voteSize}px`,
                color: "#4A4A4A",
                fontWeight: "400",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              {winner.voteCount} votos • Eleito no {getScrutinyLabel(winner.wonAtScrutiny)} Escrutínio
            </p>
          </div>

          {/* Photo OVERLAPPING bottom-right corner */}
          <div
            style={{
              position: "absolute",
              right: `${specs.photoOffsetRight}px`,
              bottom: `${specs.photoOffsetBottom}px`,
              width: `${specs.photoSize}px`,
              height: `${specs.photoSize}px`,
              borderRadius: "50%",
              backgroundColor: "#E8E8E8",
              overflow: "hidden",
              border: "4px solid #FFFFFF",
              boxShadow: "0 3px 6px rgba(0, 0, 0, 0.25)",
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
                  fontSize: is916 ? "36px" : "32px",
                  fontWeight: "700",
                  color: "#F7B731",
                  backgroundColor: "#FFF7E6",
                }}
              >
                {winner.candidateName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      );
    };

    return (
      <div className="fixed -left-[9999px] -top-[9999px]">
        <div
          ref={imageRef}
          style={{
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
            backgroundColor: "#F9F9F9",
            fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Background watermark - very subtle */}
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
              color: "#F0F0F0",
              display: "flex",
              flexWrap: "wrap",
              alignContent: "flex-start",
              gap: is916 ? "60px" : "50px",
              padding: is916 ? "120px 30px" : "100px 20px",
              transform: "rotate(-12deg)",
              zIndex: 0,
              fontFamily: "'Montserrat', sans-serif",
            }}
          >
            {Array.from({ length: 25 }).map((_, i) => (
              <span key={i} style={{ whiteSpace: "nowrap" }}>ELEIÇÃO</span>
            ))}
          </div>

          {/* Title */}
          <div
            style={{
              position: "absolute",
              top: `${specs.titleY}px`,
              left: "540px",
              transform: "translateX(-50%)",
              textAlign: "center",
              zIndex: 1,
            }}
          >
            <h1
              style={{
                fontSize: `${specs.titleSize}px`,
                fontWeight: "800",
                color: "#000000",
                margin: 0,
                lineHeight: "1",
                letterSpacing: `${specs.letterSpacing}px`,
                fontFamily: "'Montserrat', sans-serif",
              }}
            >
              <span style={{ fontWeight: "800" }}>ELEIÇÃO</span>{" "}
              <span
                style={{
                  fontWeight: "400",
                  color: "transparent",
                  WebkitTextStroke: "2px #000000",
                }}
              >
                {year}
              </span>
            </h1>
          </div>

          {/* Winner Cards - absolutely positioned */}
          {sortedWinners.map((winner, index) => (
            <WinnerCard key={winner.positionId} winner={winner} index={index} />
          ))}

          {/* Scripture */}
          <div
            style={{
              position: "absolute",
              top: `${specs.verseY}px`,
              left: "540px",
              transform: "translateX(-50%)",
              width: "900px",
              textAlign: "center",
              zIndex: 1,
            }}
          >
            <p
              style={{
                fontSize: `${specs.verseSize}px`,
                fontStyle: "italic",
                color: "#3A3A3A",
                lineHeight: "1.5",
                margin: 0,
                fontWeight: "400",
                fontFamily: "'Lato', sans-serif",
              }}
            >
              Porque de Deus somos cooperadores; lavoura de Deus,
              <br />
              edifício de Deus sois vós. - 1 coríntios 3:9
            </p>
          </div>

          {/* Logo */}
          <div
            style={{
              position: "absolute",
              top: `${specs.logoY}px`,
              left: "540px",
              transform: "translateX(-50%)",
              zIndex: 1,
            }}
          >
            <img
              src={logoUrl}
              alt="emaús"
              style={{
                width: `${specs.logoWidth}px`,
                height: `${specs.logoHeight}px`,
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
