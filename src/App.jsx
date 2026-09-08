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

  const [favoris, setFavoris] = useState(() => {
    const favorisSauvegardes = localStorage.getItem("favoris");

    return favorisSauvegardes
      ? JSON.parse(favorisSauvegardes)
      : [];
  });

  const [afficherFavoris, setAfficherFavoris] = useState(false);
  const [afficherRecentes, setAfficherRecentes] = useState(false);
  const [menuOuvert, setMenuOuvert] = useState(false);

  const resultatsRef = useRef(null);
  const [pageToken, setPageToken] = useState("");

  useEffect(() => {
    localStorage.setItem(
      "recherchesRecentes",
      JSON.stringify(recherchesRecentes)
    );
  }, [recherchesRecentes]);

  useEffect(() => {
    localStorage.setItem("favoris", JSON.stringify(favoris));
  }, [favoris]);

  const categories = [
    "Maison",
    "Bricolage",
    "Cuisine",
    "Jardin",
    "Auto",
    "Informatique",
  ];

  const gererFavori = (video) => {
    setFavoris((anciensFavoris) => {
      const dejaFavori = anciensFavoris.some(
        (favori) => favori.id.videoId === video.id.videoId
      );

      if (dejaFavori) {
        return anciensFavoris.filter(
          (favori) => favori.id.videoId !== video.id.videoId
        );
      }

      return [...anciensFavoris, video];
    });
  };

  const lancerRecherche = async (
    rechercheAUtiliser = recherche,
    categorieRecherche = categorie
  ) => {
    if (rechercheAUtiliser.trim() === "" && !categorieRecherche) {
      setErreur(
        "Choisis une catégorie ou écris quelque chose à rechercher."
      );
      return;
    }

    setAfficherFavoris(false);
    setAfficherRecentes(false);

    if (rechercheAUtiliser.trim() !== "") {
      setRecherche(rechercheAUtiliser);

      setRecherchesRecentes((anciennes) => {
        const nouvelleRecherche = rechercheAUtiliser.trim();

        const nouvelles = [
          nouvelleRecherche,
          ...anciennes.filter(
            (item) => item !== nouvelleRecherche
          ),
        ];

        return nouvelles.slice(0, 5);
      });
    }

    setChargement(true);
    setResultats([]);
    setErreur("");

    try {
      const termeRecherche =
        categorieRecherche && rechercheAUtiliser.trim()
          ? `${rechercheAUtiliser} ${categorieRecherche} tutoriel`
          : `${categorieRecherche || rechercheAUtiliser} tutoriel`;

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
          termeRecherche
        )}&type=video&order=relevance&maxResults=12&key=${import.meta.env.VITE_YOUTUBE_API_KEY}`
      );

      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const resultatsTries = [...data.items].sort((a, b) => {
          const motsTutoriel = [
            "tutoriel",
            "comment",
            "comment faire",
            "guide",
            "diy",
            "étape",
            "débutant",
          ];

          const motsIndesirables = [
            "vlog",
            "reaction",
            "réaction",
            "actualité",
            "news",
            "live",
            "podcast",
          ];

          const score = (video) => {
            const titre = video.snippet.title.toLowerCase();

            const motsIgnorer = [
              "comment",
              "pour",
              "avec",
              "dans",
              "faire",
              "une",
              "des",
              "les",
              "sur",
              "par",
              "mon",
              "ma",
              "mes",
              "du",
              "de",
              "et",
              "ou",
            ];

            const motsRecherche = rechercheAUtiliser
              .toLowerCase()
              .trim()
              .split(/\s+/)
              .filter(
                (mot) =>
                  mot.length > 2 &&
                  !motsIgnorer.includes(mot)
              );

            let total = motsTutoriel.reduce((score, mot) => {
              return score + (titre.includes(mot) ? 1 : 0);
            }, 0);

            total -= motsIndesirables.reduce((score, mot) => {
              return score + (titre.includes(mot) ? 2 : 0);
            }, 0);

            motsRecherche.forEach((mot) => {
              if (titre.includes(mot)) {
                total += 3;
              }
            });

            return total;
          };

          return score(b) - score(a);
        });

        setResultats(resultatsTries);
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

      setErreur(
        "Impossible de récupérer les résultats. Réessaie."
      );

      setChargement(false);
    }
  };

  const chargerPlus = async () => {
    if (!pageToken) return;

    setChargement(true);

    try {
      const termeRecherche = categorie
        ? `${categorie} ${recherche} tutoriel`
        : `${recherche} tutoriel`;

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
          termeRecherche
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
      console.error(
        "Erreur chargement supplémentaire :",
        error
      );

      setChargement(false);
    }
  };

  const videosAffichees = afficherFavoris
    ? favoris
    : resultats;

  return (
    <div className="app">

      <button
        className="bouton-menu"
        onClick={() => setMenuOuvert(!menuOuvert)}
        aria-label="Ouvrir le menu"
      >
        ☰
      </button>

      <nav
        className={`menu-lateral ${
          menuOuvert ? "ouvert" : ""
        }`}
      >
        <button
          onClick={() => {
            setAfficherFavoris(false);
            setAfficherRecentes(false);
            setMenuOuvert(false);
          }}
        >
          🏠 Accueil
        </button>

        <button
          onClick={() => {
            setAfficherFavoris(true);
            setAfficherRecentes(false);
            setMenuOuvert(false);
          }}
        >
          ⭐ Mes favoris
        </button>

        <button
          onClick={() => {
            setAfficherFavoris(false);
            setAfficherRecentes(true);
            setMenuOuvert(false);
          }}
        >
          🕘 Recherches récentes
        </button>

        <button>
          📁 Mes listes
        </button>
      </nav>

      {afficherRecentes ? (
        <>
          <div
            className="titre-resultats"
            ref={resultatsRef}
          >
            <h2>🕘 Recherches récentes</h2>

            <p>
              {recherchesRecentes.length} recherche
              {recherchesRecentes.length > 1
                ? "s"
                : ""} enregistrée
              {recherchesRecentes.length > 1
                ? "s"
                : ""}
            </p>
          </div>

          {recherchesRecentes.length === 0 ? (
            <div className="message-accueil">
              <h2>Aucune recherche récente</h2>

              <p>
                Vos recherches apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="recherches-recentes menu-recherches">
              {recherchesRecentes.map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setRecherche(item);
                    setAfficherRecentes(false);
                    lancerRecherche(item);
                  }}
                >
                  🔎 {item}
                </button>
              ))}
            </div>
          )}
        </>
      ) : afficherFavoris ? (
        <>
          <div
            className="titre-resultats"
            ref={resultatsRef}
          >
            <h2>⭐ Mes favoris</h2>

            <p>
              {favoris.length}{" "}
              {favoris.length > 1
                ? "tutoriels enregistrés"
                : "tutoriel enregistré"}
            </p>
          </div>

          {favoris.length === 0 && (
            <div className="message-accueil">
              <h2>
                Aucun favori pour le moment
              </h2>

              <p>
                Ajoutez des tutoriels à vos favoris
                avec l'étoile ⭐.
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          <h1 className="logo">
            TutoFind
          </h1>

          <p>
            Trouvez facilement des tutoriels vidéo
            sur tous les sujets.
          </p>

          <div className="search">
            <input
              type="text"
              placeholder="Que cherchez-vous ?"
              value={recherche}
              onChange={(e) =>
                setRecherche(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  lancerRecherche();
                }
              }}
              spellCheck="false"
            />

            <button
              className="search-button"
              onClick={() =>
                lancerRecherche()
              }
            >
              Rechercher
            </button>

            <div className="mes-favoris">
              <button
                onClick={() =>
                  setAfficherFavoris(
                    !afficherFavoris
                  )
                }
              >
                {afficherFavoris
                  ? "← Retour aux résultats"
                  : `⭐ Mes favoris (${favoris.length})`}
              </button>
            </div>
          </div>

          {recherchesRecentes.length > 0 && (
            <div className="recherches-recentes">
              <span>
                Recherches récentes :
              </span>

              {recherchesRecentes.map(
                (item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setRecherche(item);
                      lancerRecherche(item);
                    }}
                  >
                    {item}
                  </button>
                )
              )}
            </div>
          )}

          <div className="categories">
            {categories.map((nom) => (
              <button
                key={nom}
                onClick={() => {
                  const nouvelleCategorie =
                    categorie === nom
                      ? ""
                      : nom;

                  setCategorie(
                    nouvelleCategorie
                  );

                  setResultats([]);
                  setErreur("");

                  lancerRecherche(
                    recherche,
                    nouvelleCategorie
                  );
                }}
                className={
                  categorie === nom
                    ? "active"
                    : ""
                }
              >
                {nom}
              </button>
            ))}
          </div>

          {categorie && (
            <p>
              Catégorie sélectionnée :{" "}
              {categorie}
            </p>
          )}

          {chargement && (
            <p>
              Recherche en cours...
            </p>
          )}

          {!chargement &&
            !erreur &&
            resultats.length === 0 && (
              <div className="message-accueil">
                <h2>
                  Que voulez-vous apprendre
                  aujourd'hui ?
                </h2>

                <p>
                  Recherchez un tutoriel ou
                  choisissez une catégorie.
                </p>
              </div>
            )}

          {erreur && (
            <p>{erreur}</p>
          )}

          {resultats.length > 0 && (
            <div
              className="titre-resultats"
              ref={resultatsRef}
            >
              <h2>
                Résultats pour :{" "}
                {recherche}
              </h2>

              <p>
                {resultats.length} résultats
                trouvés
              </p>
            </div>
          )}
        </>
      )}

      {videosAffichees.length > 0 && (
        <div className="resultats">
          {videosAffichees.map(
            (resultat) => {
              const estFavori =
                favoris.some(
                  (favori) =>
                    favori.id.videoId ===
                    resultat.id.videoId
                );

              return (
                <div
                  className="resultat"
                  key={resultat.id.videoId}
                >
                  <div className="image-resultat">
                    <img
                      src={
                        resultat.snippet
                          .thumbnails.medium.url
                      }
                      alt={
                        resultat.snippet.title
                      }
                    />

                    <span className="badge-tutoriel">
                      TUTORIEL
                    </span>

                    <button
                      className={`bouton-favori ${
                        estFavori
                          ? "favori-actif"
                          : ""
                      }`}
                      onClick={() =>
                        gererFavori(
                          resultat
                        )
                      }
                      aria-label={
                        estFavori
                          ? "Retirer des favoris"
                          : "Ajouter aux favoris"
                      }
                    >
                      {estFavori
                        ? "★"
                        : "☆"}
                    </button>
                  </div>

                  <h3>
                    {resultat.snippet.title}
                  </h3>

                  <small>
                    <span className="chaine">
                      {
                        resultat.snippet
                          .channelTitle
                      }
                    </span>

                    <span className="date-video">
                      {" "}
                      ·{" "}
                      {new Date(
                        resultat.snippet
                          .publishedAt
                      ).toLocaleDateString(
                        "fr-FR"
                      )}
                    </span>
                  </small>

                  <p>
                    {resultat.snippet
                      .description.length >
                    120
                      ? resultat.snippet.description.substring(
                          0,
                          120
                        ) + "..."
                      : resultat.snippet
                          .description}
                  </p>

                  <a
                    href={`https://www.youtube.com/watch?v=${resultat.id.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Voir le tutoriel
                  </a>
                </div>
              );
            }
          )}
        </div>
      )}

      {!afficherFavoris &&
        !afficherRecentes &&
        pageToken && (
          <button
            className="voir-plus"
            onClick={chargerPlus}
            disabled={chargement}
          >
            {chargement
              ? "Chargement..."
              : "Voir plus"}
          </button>
        )}
    </div>
  );
}

export default App;