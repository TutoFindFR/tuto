import { useState, useRef, useEffect } from "react";
import "./App.css";

function App() {
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [categorie, setCategorie] = useState("");
  const [resultats, setResultats] = useState([]);
  const [recherchesRecentes, setRecherchesRecentes] = useState(() => {
    const recherchesSauvegardees =
      localStorage.getItem("recherchesRecentes");

    return recherchesSauvegardees
      ? JSON.parse(recherchesSauvegardees)
      : [];
  });

  const resultatsRef = useRef(null);
  const [pageToken, setPageToken] = useState("");

  useEffect(() => {
    localStorage.setItem(
      "recherchesRecentes",
      JSON.stringify(recherchesRecentes)
    );
  }, [recherchesRecentes]);

  const categories = [
    "Maison",
    "Bricolage",
    "Cuisine",
    "Jardin",
    "Auto",
    "Informatique",
  ];

  const lancerRecherche = async (
    rechercheAUtiliser = recherche,
    categorieRecherche = categorie
  ) => {
    if (rechercheAUtiliser.trim() === "" && !categorieRecherche) {
      setErreur("Choisis une catégorie ou écris quelque chose à rechercher.");
      return;
    }

    if (rechercheAUtiliser.trim() !== "") {
      setRecherche(rechercheAUtiliser);

      setRecherchesRecentes((anciennes) => {
        const nouvelleRecherche = rechercheAUtiliser.trim();

        const nouvelles = [
          nouvelleRecherche,
          ...anciennes.filter((item) => item !== nouvelleRecherche),
        ];

        return nouvelles.slice(0, 5);
      });
    }

    setChargement(true);
    setResultats([]);
    setErreur("");

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
          categorieRecherche && rechercheAUtiliser.trim()
            ? `${categorieRecherche} ${rechercheAUtiliser} tutoriel`
            : `${categorieRecherche || rechercheAUtiliser} tutoriel`
        )}&type=video&maxResults=12&key=${import.meta.env.VITE_YOUTUBE_API_KEY}`
      );

      const data = await response.json();

      if (data.items && data.items.length > 0) {
        setResultats(data.items);
        setPageToken(data.nextPageToken || "");

        setTimeout(() => {
          resultatsRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 100);
      } else {
        setErreur("Aucun résultat trouvé pour cette recherche.");
        setPageToken("");
      }

      setChargement(false);
    } catch (error) {
      console.error("Erreur YouTube :", error);
      setErreur("Impossible de récupérer les résultats. Réessaie.");
      setChargement(false);
    }
  };

  const chargerPlus = async () => {
    if (!pageToken) return;

    setChargement(true);

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
          categorie
            ? `${categorie} ${recherche} tutoriel`
            : `${recherche} tutoriel`
        )}&type=video&maxResults=12&pageToken=${pageToken}&key=${import.meta.env.VITE_YOUTUBE_API_KEY}`
      );

      const data = await response.json();

      if (data.items) {
        setResultats((anciensResultats) => [
          ...anciensResultats,
          ...data.items,
        ]);
      }

      setPageToken(data.nextPageToken || "");
      setChargement(false);
    } catch (error) {
      console.error("Erreur chargement supplémentaire :", error);
      setChargement(false);
    }
  };

  return (
    <div className="app">
      <h1 className="logo">TutoFind</h1>

      <p>Trouvez facilement des tutoriels vidéo sur tous les sujets.</p>

      <div className="search">
        <input
          type="text"
          placeholder="Que cherchez-vous ?"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              lancerRecherche();
            }
          }}
          spellCheck="false"
        />

        <button className="search-button" onClick={() => lancerRecherche()}>
          Rechercher
        </button>
      </div>

      {recherchesRecentes.length > 0 && (
        <div className="recherches-recentes">
          <span>Recherches récentes :</span>

          {recherchesRecentes.map((item) => (
            <button
              key={item}
              onClick={() => {
                setRecherche(item);
                lancerRecherche(item);
              }}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      <div className="categories">
        {categories.map((nom) => (
          <button
            key={nom}
            onClick={() => {
  const nouvelleCategorie = categorie === nom ? "" : nom;

  setCategorie(nouvelleCategorie);
  setResultats([]);
  setErreur("");
  lancerRecherche(recherche, nouvelleCategorie);
}}
            className={categorie === nom ? "active" : ""}
          >
            {nom}
          </button>
        ))}
      </div>

      {categorie && <p>Catégorie sélectionnée : {categorie}</p>}

      {chargement && <p>Recherche en cours...</p>}

      {!chargement && !erreur && resultats.length === 0 && (
        <div className="message-accueil">
          <h2>Que voulez-vous apprendre aujourd'hui ?</h2>
          <p>Recherchez un tutoriel ou choisissez une catégorie.</p>
        </div>
      )}

      {erreur && <p>{erreur}</p>}

      {resultats.length > 0 && (
        <div className="titre-resultats" ref={resultatsRef}>
          <h2>Résultats pour : {recherche}</h2>
          <p>{resultats.length} résultats trouvés</p>
        </div>
      )}

      <div className="resultats">
        {resultats.map((resultat) => (
          <div className="resultat" key={resultat.id.videoId}>
            <div className="image-resultat">
              <img
                src={resultat.snippet.thumbnails.medium.url}
                alt={resultat.snippet.title}
              />

              <span className="badge-tutoriel">TUTORIEL</span>
            </div>

            <h3>{resultat.snippet.title}</h3>

            <small>
              <span className="chaine">
                {resultat.snippet.channelTitle}
              </span>

              <span className="date-video">
                {" "}·{" "}
                {new Date(
                  resultat.snippet.publishedAt
                ).toLocaleDateString("fr-FR")}
              </span>
            </small>

            <p>
              {resultat.snippet.description.length > 120
                ? resultat.snippet.description.substring(0, 120) + "..."
                : resultat.snippet.description}
            </p>

            <a
              href={`https://www.youtube.com/watch?v=${resultat.id.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Voir le tutoriel
            </a>
          </div>
        ))}
      </div>

      {pageToken && (
        <button
          className="voir-plus"
          onClick={chargerPlus}
          disabled={chargement}
        >
          {chargement ? "Chargement..." : "Voir plus"}
        </button>
      )}
    </div>
  );
}

export default App;