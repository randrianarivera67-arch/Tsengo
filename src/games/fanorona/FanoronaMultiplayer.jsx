// ✅ Cache-busting : ny APK taloha dia tsy maintsy mahazo ny fanorona.html VAOVAO
// (ny WebView dia mitahiry ny .html ao anaty cache raha tsy misy ?v=)
const FANORONA_VERSION = "20260810";

export default function FanoronaMultiplayer() {
  return (
    <iframe
      src={"/fanorona.html?v=" + FANORONA_VERSION}
      title="Fanorona"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        border: 0,
        zIndex: 2147483646,
        background: "#0A0E1C",
      }}
    />
  );
}
