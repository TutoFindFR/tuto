import { useState, useRef, useEffect } from "react";
import "./App.css";

function App() {
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [categorie, setCategorie] = useState("");
  const [resultats, setResultats] = useState([]);
  const [recherchesOuvertes, setRecherchesOuvertes] = useState(false);

  const [recherchesRecentes, setRecherchesRecentes] = useState(() => {
    const sauvegardees = localStorage.getItem("recherchesRecentes");
    return sauvegardees ? JSON.parse(sauvegardees) : [];
  });

  const [favoris, setFavoris] = useState(() => {
    const sauvegardes = localStorage.getItem("favoris");
    return sauvegardes ? JSON.parse(sauvegardes) : [];
  });

  const [afficherFavoris, setAfficherFavoris] = useState(false);
  const [afficherRecentes, setAfficherRecentes] = useState(false);

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

  useEffect(() => {
    const categoriesAccueil = [
      "Maison",
      "Bricolage",
      "Cuisine",
      "Jardin",
      "Auto",
      "Informatique",
    ];

    const categorieAleatoire =
      categoriesAccueil[
        Math.floor(Math.random() * categoriesAccueil.length)
      ];

    lancerRecherche("", categorieAleatoire);
  }, []);

  const categories = [
    "Maison",
    "Bricolage",
    "Cuisine",
    "Jardin",
    "Auto",
    "Informatique",
  ];

  const revenirAccueil = () => {
    setAfficherFavoris(false);
    setAfficherRecentes(false);
    setRecherchesOuvertes(false);
  };

  const fermerRecherches = () => {
    setRecherchesOuvertes(false);
  };

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
    if (
      rechercheAUtiliser.trim() === "" &&
      !categorieRecherche
    ) {
      setErreur(
        "Choisis une catégorie ou écris quelque chose à rechercher."
      );
      return;
    }

    setAfficherFavoris(false);
    setAfficherRecentes(false);
    setRecherchesOuvertes(false);

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
        )}&type=video&order=relevance&maxResults=12&key=${
          import.meta.env.VITE_YOUTUBE_API_KEY
        }`
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

            let total = motsTutoriel.reduce(
              (scoreActuel, mot) =>
                scoreActuel +
                (titre.includes(mot) ? 1 : 0),
              0
            );

            total -= motsIndesirables.reduce(
              (scoreActuel, mot) =>
                scoreActuel +
                (titre.includes(mot) ? 2 : 0),
              0
            );

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
        setErreur(
          "Aucun résultat trouvé pour cette recherche."
        );
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
        )}&type=video&maxResults=12&pageToken=${pageToken}&key=${
          import.meta.env.VITE_YOUTUBE_API_KEY
        }`
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

  const ouvrirTutoriel = (videoId) => {
    window.open(
      `https://www.youtube.com/watch?v=${videoId}`,
      "_blank"
    );
  };

  const videosAffichees = afficherFavoris
    ? favoris
    : afficherRecentes
    ? []
    : resultats;

  return (
    <div
      className="app"
      onClick={fermerRecherches}
    >
      <button
  className="bouton-favoris-menu"
  onClick={() => {
    setAfficherFavoris(true);
    setAfficherRecentes(false);
    setRecherchesOuvertes(false);
  }}
  aria-label="Mes favoris"
>
  ⭐
</button>
      <button
        className="bouton-accueil"
        onClick={revenirAccueil}
        aria-label="Retour à l'accueil"
      >
        🏠
      </button>

      {(afficherFavoris || afficherRecentes) && (
        <button
          className="back-home-button"
          onClick={revenirAccueil}
          aria-label="Retour à l'accueil"
        >
          ←
        </button>
      )}

      {afficherRecentes ? (
        <>
          <div
            className="titre-resultats"
            ref={resultatsRef}
          >
            <h2>🕘 Recherches récentes</h2>

            <p>
              {recherchesRecentes.length} recherche
              {recherchesRecentes.length > 1 ? "s" : ""}
              {" "}
              enregistrée
              {recherchesRecentes.length > 1 ? "s" : ""}
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
              <h2>Aucun favori pour le moment</h2>

              <p>
                Ajoutez des tutoriels à vos favoris
                avec l'étoile ⭐.
              </p>
            </div>
          )}

          {favoris.length > 0 && (
            <div className="resultats">
              {favoris.map((resultat) => {
                const estFavori = favoris.some(
                  (favori) =>
                    favori.id.videoId ===
                    resultat.id.videoId
                );

                return (
                  <div
                    className="resultat"
                    key={resultat.id.videoId}
                    onClick={() =>
                      ouvrirTutoriel(resultat.id.videoId)
                    }
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" ||
                        e.key === " "
                      ) {
                        e.preventDefault();
                        ouvrirTutoriel(
                          resultat.id.videoId
                        );
                      }
                    }}
                  >
                    <div className="image-resultat">
                      <img
                        src={
                          resultat.snippet.thumbnails
                            .medium.url
                        }
                        alt={resultat.snippet.title}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          gererFavori(resultat);
                        }}
                        aria-label={
                          estFavori
                            ? "Retirer des favoris"
                            : "Ajouter aux favoris"
                        }
                      >
                        {estFavori ? "★" : "☆"}
                      </button>
                    </div>

                    <h3>{resultat.snippet.title}</h3>

                    <small>
                      <span className="chaine">
                        {resultat.snippet.channelTitle}
                      </span>

                      <span className="date-video">
                        {" · "}
                        {new Date(
                          resultat.snippet.publishedAt
                        ).toLocaleDateString("fr-FR")}
                      </span>
                    </small>

                    <p>
                      {resultat.snippet.description.length >
                      120
                        ? resultat.snippet.description.substring(
                            0,
                            120
                          ) + "..."
                        : resultat.snippet.description}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <h1 className="logo">TutoFind</h1>

          <p>
            Trouvez facilement des tutoriels vidéo
            sur tous les sujets.
          </p>

          <div
            className="search"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              placeholder="Que cherchez-vous ?"
              value={recherche}
              onChange={(e) => {
                setRecherche(e.target.value);
                setRecherchesOuvertes(false);
              }}
              onFocus={() => {
                if (
                  recherchesRecentes.length > 0 &&
                  recherche.trim() === ""
                ) {
                  setRecherchesOuvertes(true);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setRecherchesOuvertes(false);
                  lancerRecherche();
                }
              }}
              spellCheck="false"
            />

            {recherchesOuvertes &&
              recherchesRecentes.length > 0 && (
                <div
                  className="recherches-recentes-dropdown"
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                >
                  <div className="recherches-recentes-titre">
                    Recherches récentes
                  </div>

                  {recherchesRecentes.map((item) => (
                    <button
                      key={item}
                      onClick={() => {
                        setRecherche(item);
                        setRecherchesOuvertes(false);
                        lancerRecherche(item);
                      }}
                    >
                      <span className="icone-recherche">
                        🕘
                      </span>

                      <span className="texte-recherche">
                        {item}
                      </span>
                    </button>
                  ))}
                </div>
              )}

            <button
              className="search-button"
              onClick={() => {
                setRecherchesOuvertes(false);
                lancerRecherche();
              }}
            >
              Rechercher
            </button>

            <div className="mes-favoris">
              <button
                onClick={() => {
                  setAfficherFavoris(!afficherFavoris);
                  setAfficherRecentes(false);
                  setRecherchesOuvertes(false);
                }}
              >
                ⭐ Mes favoris ({favoris.length})
              </button>
            </div>
          </div>

          <div className="categories">
            {categories.map((nom) => (
              <button
                key={nom}
                onClick={() => {
                  const nouvelleCategorie =
                    categorie === nom ? "" : nom;

                  setCategorie(nouvelleCategorie);
                  setResultats([]);
                  setErreur("");
                  setRecherchesOuvertes(false);

                  lancerRecherche(
                    recherche,
                    nouvelleCategorie
                  );
                }}
                className={
                  categorie === nom ? "active" : ""
                }
              >
                {nom}
              </button>
            ))}
          </div>

          {categorie && (
            <p>
              Catégorie sélectionnée : {categorie}
            </p>
          )}

          {chargement && (
            <p>Recherche en cours...</p>
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
                  Recherchez un tutoriel ou choisissez
                  une catégorie.
                </p>
              </div>
            )}

          {erreur && <p>{erreur}</p>}

          {resultats.length > 0 && (
            <div
              className="titre-resultats"
              ref={resultatsRef}
            >
              <h2>
                Résultats pour : {recherche}
              </h2>

              <p>
                {resultats.length} résultats trouvés
              </p>
            </div>
          )}
        </>
      )}

      {!afficherFavoris &&
        !afficherRecentes &&
        videosAffichees.length > 0 && (
          <div className="resultats">
            {videosAffichees.map((resultat) => {
              const estFavori = favoris.some(
                (favori) =>
                  favori.id.videoId ===
                  resultat.id.videoId
              );

              return (
                <div
                  className="resultat"
                  key={resultat.id.videoId}
                  onClick={() =>
                    ouvrirTutoriel(resultat.id.videoId)
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" ||
                      e.key === " "
                    ) {
                      e.preventDefault();
                      ouvrirTutoriel(
                        resultat.id.videoId
                      );
                    }
                  }}
                >
                  <div className="image-resultat">
                    <img
                      src={
                        resultat.snippet.thumbnails
                          .medium.url
                      }
                      alt={resultat.snippet.title}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        gererFavori(resultat);
                      }}
                      aria-label={
                        estFavori
                          ? "Retirer des favoris"
                          : "Ajouter aux favoris"
                      }
                    >
                      {estFavori ? "★" : "☆"}
                    </button>
                  </div>

                  <h3>{resultat.snippet.title}</h3>

                  <small>
                    <span className="chaine">
                      {resultat.snippet.channelTitle}
                    </span>

                    <span className="date-video">
                      {" · "}
                      {new Date(
                        resultat.snippet.publishedAt
                      ).toLocaleDateString("fr-FR")}
                    </span>
                  </small>

                  <p>
                    {resultat.snippet.description.length >
                    120
                      ? resultat.snippet.description.substring(
                          0,
                          120
                        ) + "..."
                      : resultat.snippet.description}
                  </p>
                </div>
              );
            })}
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