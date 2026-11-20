<#
.SYNOPSIS
  Fills an Advent Calendar edition with the 24 demo posts and adds a "Classic" theme profile.
  Remplit une édition du Calendrier de l'Avent avec les 24 publications de démonstration et ajoute un profil « Classique ».

.DESCRIPTION
  Safe by default: the script only ADDS what is missing, like the import from the administration screen
  (Administration › Posts › Import the demo content).

  - Checks that the AdventPublications and AdventSettings lists exist (app added to the site).
  - Posts: creates the demo post of every day of the edition that has no post yet (key AdvKey = YYYY-DD), in the
    requested language. Days that already have a post (published or draft) are skipped, unless -Overwrite is set.
    Same content as src/webparts/adventCalendar/defaults/demo/demoContent.ts (keep both in sync).
  - Illustrations: uploads the illustrations of the days written (src/webparts/adventCalendar/assets/demo/day-NN.svg)
    to Site Assets / AdventCalendarDemo. Files with the same name are overwritten: this folder is reserved for the
    demo content, as with the import from the administration screen. If an illustration cannot be uploaded, the post
    is still created without an image and a warning is shown.
  - Theme profile: creates the "Classique" (fr) or "Classic" (en) profile with the values of the default template
    (defaults/themes/themePresets.ts). It is created active only if no profile is active yet, inactive otherwise.
    Existing profiles are never modified, including a profile that already has this name, unless -ActivateProfile
    is set.

  The web part already displays this demo content while the edition has no published post (in each reader's
  language), and the administration screen can import it: the script is only needed to prepare a site in advance
  or from a workstation.

  Supports -WhatIf and -Confirm: with -WhatIf, nothing is written (posts, illustrations, profiles).

  Requirements: PowerShell 7.4+, the PnP.PowerShell 3.x module, a Microsoft Entra ID application (ClientId)
  registered for PnP PowerShell interactive login, and the app already added to the site.
  The tree columns (AdvTreeColor…) of sites upgraded from 1.x are created when a site owner first displays the
  web part: open the page once before running the script on such a site.

  PowerShell treats the typographic apostrophe as a string delimiter: the strings below use the
  straight apostrophe, doubled ('') inside single-quoted strings.

.PARAMETER SiteUrl
  URL of the SharePoint site where the Advent Calendar app is added.

.PARAMETER Year
  Edition to fill (2000 to 2100). Default: the edition selected by default in Administration › Posts, that is the
  current year from September to December, the previous year from January to August.

.PARAMETER Language
  Language of the demo posts and of the profile name: fr (default) or en.

.PARAMETER ClientId
  Microsoft Entra ID application used by PnP PowerShell. Default: the ENTRAID_APP_ID environment variable.

.PARAMETER DraftDays
  Days created as drafts (not published), for example 23,24, to test the "Coming soon" door.

.PARAMETER Overwrite
  Replaces the posts of the days that already have one (title, content, image, link, opening date and status).
  Without it, those days are left unchanged.

.PARAMETER ActivateProfile
  Makes the "Classique" / "Classic" profile the active profile (created if needed, existing values kept) and
  deactivates the other profiles. Without it, existing profiles are left unchanged.

.EXAMPLE
  ./scripts/seed-demo.ps1 -SiteUrl https://contoso.sharepoint.com/sites/xmas -ClientId 00000000-0000-0000-0000-000000000000

  French demo posts for the default edition; existing days and profiles are kept.

.EXAMPLE
  ./scripts/seed-demo.ps1 -SiteUrl https://contoso.sharepoint.com/sites/xmas -Language en -Year 2027 -DraftDays 23,24

  English demo posts for 2027, days 23 and 24 created as drafts ("Coming soon" door).

.EXAMPLE
  ./scripts/seed-demo.ps1 -SiteUrl https://contoso.sharepoint.com/sites/xmas -Year 2026 -Overwrite -WhatIf

  Shows which posts would be created or replaced for 2026, without writing anything.

.EXAMPLE
  ./scripts/seed-demo.ps1 -SiteUrl https://contoso.sharepoint.com/sites/xmas -Overwrite -ActivateProfile -Confirm

  Resets the 24 days to the demo content and activates the "Classique" profile, asking for confirmation before each change.

.NOTES
  Author: MARZAQ Ahmed (https://marzaqconsulting.fr/). License: MIT.

.LINK
  https://pnp.github.io/powershell/
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [Parameter(Mandatory = $true)]
  [string] $SiteUrl,

  [ValidateRange(2000, 2100)]
  [int] $Year = $(if ((Get-Date).Month -ge 9) { (Get-Date).Year } else { (Get-Date).Year - 1 }),

  [ValidateSet('fr', 'en')]
  [string] $Language = 'fr',

  [string] $ClientId = $env:ENTRAID_APP_ID,

  [ValidateRange(1, 24)]
  [int[]] $DraftDays = @(),

  [switch] $Overwrite,

  [switch] $ActivateProfile
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not (Get-Module -ListAvailable -Name PnP.PowerShell)) {
  throw "PnP.PowerShell module not found. Install it: Install-Module PnP.PowerShell -Scope CurrentUser"
}
if ([string]::IsNullOrWhiteSpace($ClientId)) {
  throw "Specify -ClientId (Entra ID application for PnP PowerShell) or set the ENTRAID_APP_ID environment variable."
}

Write-Host "Connecting to $SiteUrl…" -ForegroundColor Cyan
Connect-PnPOnline -Url $SiteUrl -Interactive -ClientId $ClientId

# ---------------------------------------------------------------- List check
$publicationsList = Get-PnPList -Identity "Lists/AdventPublications" -ErrorAction SilentlyContinue
$settingsList = Get-PnPList -Identity "Lists/AdventSettings" -ErrorAction SilentlyContinue
if (-not $publicationsList -or -not $settingsList) {
  throw "Calendar lists not found. Add the Advent Calendar app to the site (or display the web part as a site owner), then run the script again."
}

# ---------------------------------------------------------------- Content (same as defaults/demo/demoContent.ts)
$allContents = @{
  fr = @(
    @{ Title = 'Bienvenue dans le calendrier de l''Avent !'; Body = '<p>Jusqu''au 24 décembre, une case s''ouvre chaque jour : traditions du monde, recettes, bricolages, énigmes, chansons et petits défis à partager en équipe.</p><h3>Le saviez-vous ?</h3><p>Le calendrier de l''Avent est né en Allemagne au XIX<sup>e</sup> siècle. Les familles comptaient les jours jusqu''à Noël en traçant chaque soir un trait à la craie sur une porte, en allumant une bougie ou en accrochant une petite image.</p><ul><li>Les premiers calendriers imprimés apparaissent au début du XX<sup>e</sup> siècle ;</li><li>les petites fenêtres à ouvrir se généralisent ensuite ;</li><li>les versions garnies de chocolats se répandent dans les années 1950.</li></ul><p><strong>Revenez chaque jour : les cases passées restent accessibles, et celles que vous avez déjà ouvertes sont marquées d''une coche.</strong></p>'; Link = 'https://fr.wikipedia.org/wiki/Calendrier_de_l%27Avent'; LinkText = 'L''histoire du calendrier de l''Avent' },
    @{ Title = 'Recette : le chocolat chaud maison'; Body = '<p>Rien de tel qu''une tasse fumante pour lancer la saison. Une recette express, prête en 10 minutes.</p><h3>Ingrédients (2 tasses)</h3><ul><li>50 cl de lait (ou de boisson à l''avoine)</li><li>100 g de chocolat noir</li><li>1 cuillère à soupe de sucre (facultatif)</li><li>1 pincée de cannelle et 1 pincée de sel</li></ul><h3>Préparation</h3><ol><li>Faites chauffer le lait à feu doux, sans le laisser bouillir.</li><li>Hors du feu, ajoutez le chocolat haché et laissez-le fondre 1 minute.</li><li>Fouettez vivement avec le sucre, la cannelle et le sel jusqu''à obtenir une boisson lisse et mousseuse.</li></ol><p><strong>Astuce :</strong> faites infuser un zeste d''orange ou une gousse de vanille fendue dans le lait chaud pendant 5 minutes. Effet garanti !</p>' },
    @{ Title = 'Les énigmes du lutin'; Body = '<p>Deux énigmes pour réveiller les neurones avant la pause café. Réfléchissez bien avant de cliquer !</p><h3>1. Les chaussettes du lutin</h3><p>Dans un tiroir plongé dans le noir, un lutin range 10 chaussettes rouges et 10 chaussettes vertes, toutes mélangées. Combien doit-il en prendre, sans regarder, pour être certain d''avoir une paire de la même couleur ?</p><details><summary>Voir la réponse</summary><p><strong>3 chaussettes.</strong> Avec seulement deux couleurs possibles, deux des trois chaussettes sont forcément de la même couleur.</p></details><h3>2. Qui suis-je ?</h3><p>Je suis grande quand je suis jeune, et petite quand je suis vieille. C''est en décembre que je brille le plus.</p><details><summary>Voir la réponse</summary><p><strong>Une bougie !</strong></p></details>' },
    @{ Title = 'Bricolage : le flocon en papier'; Body = '<p>Cinq minutes, une feuille et des ciseaux suffisent pour décorer une fenêtre ou un bureau. Et aucun flocon ne ressemblera à un autre !</p><h3>Matériel</h3><p>Une feuille de papier carrée (blanche, kraft ou recyclée) et une paire de ciseaux.</p><h3>Étapes</h3><ol><li>Pliez le carré en deux en diagonale pour obtenir un triangle, puis encore une fois en deux.</li><li>Repliez ce triangle en trois, comme un éventail : le flocon aura six branches, comme un vrai cristal de neige.</li><li>Coupez la pointe qui dépasse, puis découpez des encoches, des triangles et des arrondis sur les bords.</li><li>Dépliez délicatement… et admirez.</li></ol><p><strong>Défi :</strong> suspendez vos flocons à une fenêtre avec un fil et partagez une photo avec l''équipe.</p>' },
    @{ Title = 'Le saviez-vous ? L''histoire des boules de Noël'; Body = '<p>Avant les boules, les sapins se paraient de gourmandises. En 1605, une chronique de Strasbourg décrit des arbres décorés de roses en papier, de pommes, d''hosties et de sucreries.</p><ul><li><strong>Le verre soufflé</strong> : au milieu du XIX<sup>e</sup> siècle, les souffleurs de verre de Lauscha, en Thuringe (Allemagne), fabriquent des décorations en verre qui gagnent bientôt toute l''Europe.</li><li><strong>La légende lorraine</strong> : en 1858, une sécheresse aurait privé la région de pommes ; un verrier des Vosges du Nord aurait alors soufflé des boules de verre pour les remplacer.</li><li><strong>Aujourd''hui encore</strong>, des verriers lorrains créent chaque année une nouvelle boule soufflée à la bouche.</li></ul><p>Et chez vous, quelle est la décoration la plus ancienne du sapin ? Elle a sûrement une histoire à raconter.</p>'; Link = 'https://fr.wikipedia.org/wiki/Boule_de_No%C3%ABl'; LinkText = 'En savoir plus sur les boules de Noël' },
    @{ Title = 'Tradition : la Saint-Nicolas'; Body = '<p>Le 6 décembre, on fête saint Nicolas dans l''est et le nord de la France, en Belgique, aux Pays-Bas, au Luxembourg, en Allemagne, en Suisse et dans une grande partie de l''Europe centrale.</p><ul><li><strong>Qui était-il ?</strong> Un évêque du IV<sup>e</sup> siècle, à Myre (dans l''actuelle Turquie), réputé pour sa générosité et devenu le saint patron des enfants.</li><li><strong>La veille au soir</strong>, les enfants déposent leurs souliers devant la cheminée ou la porte, parfois avec une carotte pour sa monture.</li><li><strong>Au réveil</strong> : mandarines, pain d''épices, chocolats et petits cadeaux.</li></ul><p><strong>Le saviez-vous ?</strong> Le nom de Santa Claus, le père Noël anglophone, vient de <em>Sinterklaas</em>, le nom néerlandais de saint Nicolas, apporté à New York par les colons néerlandais.</p>'; Link = 'https://fr.wikipedia.org/wiki/Saint-Nicolas_(f%C3%AAte)'; LinkText = 'En savoir plus sur la Saint-Nicolas' },
    @{ Title = 'Jeu d''équipe : le Père Noël secret'; Body = '<p>Le principe : chacun offre un petit cadeau à un collègue tiré au sort, en gardant le secret jusqu''au jour de l''échange.</p><h3>Les règles en 5 étapes</h3><ol><li>Fixez la date de l''échange et un budget modeste, identique pour tous (par exemple 10 €).</li><li>Tirez au sort les binômes : chapeau, application ou tableur, l''essentiel est que personne ne se tire lui-même.</li><li>Invitez chacun à noter deux ou trois envies ou centres d''intérêt.</li><li>Emballez, ajoutez un mot gentil… sans le signer !</li><li>Le jour J, chacun essaie de deviner qui était son Père Noël secret.</li></ol><p><strong>Variante :</strong> autorisez les cadeaux faits maison, d''occasion ou « immatériels » (une recette, une playlist, un livre conseillé). L''important, c''est l''attention.</p>' },
    @{ Title = 'La playlist des fêtes'; Body = '<p>Des mélodies anciennes, aujourd''hui dans le domaine public, qui traversent les siècles et les frontières. Laquelle fredonnez-vous déjà ?</p><ul><li><strong>Douce nuit</strong> (<em>Stille Nacht</em>) : chantée pour la première fois le 24 décembre 1818 à Oberndorf, près de Salzbourg, sur une musique de Franz Xaver Gruber et des paroles de Joseph Mohr.</li><li><strong>Jingle Bells</strong> : publiée en 1857 par l''Américain James Lord Pierpont ; en France, on la chante sur l''air de « Vive le vent ».</li><li><strong>Mon beau sapin</strong> (<em>O Tannenbaum</em>) : une chanson populaire allemande, dans la version d''Ernst Anschütz (1824).</li><li><strong>Les anges dans nos campagnes</strong> et <strong>Il est né le divin enfant</strong> : deux noëls traditionnels français.</li><li><strong>Deck the Halls</strong> : des paroles anglaises sur un vieil air gallois.</li></ul><p><strong>À vous de jouer :</strong> partagez votre version préférée (chorale, jazz, piano solo…) et composez la playlist commune de l''équipe.</p>' },
    @{ Title = 'Quiz : la culture de Noël'; Body = '<p>Cinq questions pour tester votre culture de Noël. Notez vos réponses avant de les découvrir !</p><ol><li>Quel pays offre chaque année à Londres le grand sapin de Trafalgar Square ?</li><li>Combien de rennes tirent le traîneau dans le célèbre poème américain de 1823 <em>A Visit from St. Nicholas</em> ?</li><li>De quel pays le poinsettia, l''« étoile de Noël », est-il originaire ?</li><li>En Islande, combien de lutins farceurs, les <em>Jólasveinar</em>, rendent visite aux enfants avant Noël ?</li><li>Les « douze jours de Noël » de la tradition anglaise commencent… quel jour ?</li></ol><details><summary>Voir les réponses</summary><ol><li>La <strong>Norvège</strong>, chaque année depuis 1947, en remerciement du soutien britannique pendant la Seconde Guerre mondiale.</li><li><strong>Huit</strong>.</li><li>Du <strong>Mexique</strong> ; il doit son nom à Joel Poinsett, diplomate américain qui l''a fait connaître aux États-Unis.</li><li><strong>Treize</strong>, un par nuit à partir du 12 décembre.</li><li>Le <strong>25 décembre</strong> : ils mènent jusqu''au 5 janvier, veille de l''Épiphanie.</li></ol></details>' },
    @{ Title = 'Zen : des fêtes sans stress'; Body = '<p>Cadeaux, repas, trajets, clôtures de fin d''année… Décembre peut vite ressembler à un marathon. Quelques idées pour garder le sourire :</p><ul><li><strong>Faites une liste</strong>, puis rayez ce qui n''est pas indispensable : des fêtes « assez bien » valent mieux que des fêtes épuisantes.</li><li><strong>Fixez un budget</strong> avant de commencer vos achats.</li><li><strong>Partagez les tâches</strong> : chacun apporte un plat, chacun a un rôle.</li><li><strong>Bougez un peu</strong> : dix minutes de marche à la lumière du jour font des merveilles en hiver.</li><li><strong>Gardez des moments pour vous</strong> : un livre, une sieste, une soirée sans écran.</li></ul><p><strong>À essayer :</strong> la respiration 4-6. Inspirez par le nez sur 4 temps, puis expirez doucement par la bouche sur 6 temps, pendant une à deux minutes.</p>' },
    @{ Title = 'Le saviez-vous ? La bûche de Noël'; Body = '<p>Avant d''être un dessert, la bûche de Noël était… une vraie bûche !</p><ul><li><strong>Une tradition ancienne</strong> : dans de nombreuses régions d''Europe, on choisissait une grosse bûche que l''on faisait brûler dans l''âtre le soir de Noël, parfois pendant plusieurs jours.</li><li><strong>Un porte-bonheur</strong> : on la bénissait ou on l''arrosait de vin, et l''on conservait ses cendres pour protéger la maison.</li><li><strong>Le dessert</strong> : à mesure que les poêles remplacent les grandes cheminées, les pâtissiers parisiens popularisent au XIX<sup>e</sup> siècle un biscuit roulé décoré façon écorce, avec ses champignons en meringue et son sucre glace en guise de neige.</li></ul><p><strong>Le grand débat d''équipe :</strong> plutôt bûche au chocolat, au praliné, aux fruits rouges ou glacée ?</p>' },
    @{ Title = 'Bricolage : la guirlande d''oranges séchées'; Body = '<p>Une décoration naturelle, parfumée et sans plastique, qui finira au compost après les fêtes.</p><h3>Matériel</h3><ul><li>2 ou 3 oranges (ou des clémentines)</li><li>de la ficelle de cuisine ou du raphia</li><li>quelques bâtons de cannelle et étoiles de badiane (facultatif)</li></ul><h3>Étapes</h3><ol><li>Coupez les oranges en rondelles de 5 mm et épongez-les avec un torchon propre.</li><li>Disposez-les sur une plaque couverte de papier cuisson et faites-les sécher 2 à 3 heures au four à 90 °C, en les retournant toutes les 30 minutes.</li><li>Laissez refroidir, puis enfilez-les sur la ficelle en alternant avec la cannelle et la badiane.</li></ol><p><strong>Astuce :</strong> avec un simple bout de ficelle, une rondelle devient aussi une jolie décoration de paquet cadeau.</p>' },
    @{ Title = 'Tradition : la Sainte-Lucie en Suède'; Body = '<p>Le 13 décembre, la Suède célèbre Lucie, la porteuse de lumière, au cœur de la période la plus sombre de l''année.</p><ul><li><strong>Le cortège</strong> : vêtue d''une longue robe blanche nouée d''un ruban rouge, Lucie porte une couronne de bougies. Elle est suivie de jeunes filles tenant chacune une bougie et de garçons coiffés de chapeaux pointus ornés d''étoiles.</li><li><strong>Les chants</strong> : le cortège passe dans les écoles, les églises, les maisons de retraite et même les bureaux, en chantant.</li><li><strong>Les gourmandises</strong> : des brioches au safran en forme de S, les <em>lussekatter</em>, et des biscuits au gingembre.</li></ul><p><strong>Le saviez-vous ?</strong> Dans l''ancien calendrier julien, le 13 décembre tombait au moment du solstice d''hiver : la nuit la plus longue de l''année.</p>'; Link = 'https://fr.wikipedia.org/wiki/Sainte-Lucie_(f%C3%AAte)'; LinkText = 'En savoir plus sur la Sainte-Lucie' },
    @{ Title = 'Livres et films de saison'; Body = '<p>Pour les soirées d''hiver, quelques grands classiques à (re)découvrir, seul ou en famille :</p><ul><li><strong><em>Un chant de Noël</em></strong> (Charles Dickens, 1843) : un vieil avare reçoit en une nuit la visite de trois esprits. Un conte sur la générosité, adapté des dizaines de fois au cinéma.</li><li><strong><em>Casse-Noisette et le Roi des souris</em></strong> (E. T. A. Hoffmann, 1816) : le conte qui a inspiré le ballet de Tchaïkovski, créé en 1892 à Saint-Pétersbourg.</li><li><strong><em>Le Sapin</em></strong> (Hans Christian Andersen, 1844) : un conte court et touchant, à lire à voix haute.</li><li><strong><em>La vie est belle</em></strong> (Frank Capra, 1946) : un film en noir et blanc devenu un rendez-vous de fin d''année dans de nombreux foyers.</li></ul><p><strong>Et vous ?</strong> Partagez avec l''équipe le livre ou le film qui, pour vous, a le goût de Noël.</p>'; Link = 'https://fr.wikipedia.org/wiki/Un_chant_de_No%C3%ABl'; LinkText = 'À propos d''« Un chant de Noël »' },
    @{ Title = 'Les blagues de Noël'; Body = '<p>Un peu d''humour pour fêter la mi-parcours ! Lisez la question, cherchez la chute, puis cliquez.</p><p><strong>Pourquoi le sapin de Noël est-il si mauvais en couture ?</strong></p><details><summary>Voir la réponse</summary><p>Parce qu''il perd toujours ses aiguilles !</p></details><p><strong>Comment appelle-t-on un chat tombé dans un pot de peinture le soir de Noël ?</strong></p><details><summary>Voir la réponse</summary><p>Un chat-peint de Noël !</p></details><p><strong>Que dit un bonhomme de neige à un autre bonhomme de neige ?</strong></p><details><summary>Voir la réponse</summary><p>« Tu ne sentirais pas comme une odeur de carotte ? »</p></details><p><strong>À vous :</strong> quelle est votre meilleure (ou votre pire) blague de Noël ? Partagez-la avec l''équipe !</p>' },
    @{ Title = 'Tradition : Las Posadas au Mexique'; Body = '<p>Du 16 au 24 décembre, le Mexique vit au rythme des <em>posadas</em> : neuf soirées de fête entre voisins, une pour chaque mois de la grossesse de Marie.</p><ul><li><strong>La procession</strong> : chaque soir, un cortège rejoue la recherche d''un abri par Marie et Joseph. Devant une maison, les « pèlerins » demandent l''hospitalité en chantant ; de l''intérieur, on leur répond en chantant aussi… jusqu''à ce que la porte s''ouvre.</li><li><strong>La piñata</strong> : traditionnellement en forme d''étoile à sept pointes, on la brise les yeux bandés pour faire pleuvoir fruits et friandises.</li><li><strong>Le <em>ponche</em></strong> : une boisson chaude aux fruits (goyave, pomme, canne à sucre) parfumée à la cannelle, servie avec des tamales.</li></ul><p><em>Posada</em> signifie « auberge » en espagnol. La tradition est aussi vivante au Guatemala et dans de nombreuses communautés hispaniques des États-Unis.</p>'; Link = 'https://fr.wikipedia.org/wiki/Las_Posadas'; LinkText = 'En savoir plus sur Las Posadas' },
    @{ Title = 'Recette : les biscuits épicés'; Body = '<p>L''odeur du gingembre et de la cannelle, c''est déjà Noël ! Pour une trentaine de biscuits à découper à l''emporte-pièce.</p><h3>Ingrédients</h3><ul><li>250 g de farine</li><li>100 g de beurre mou</li><li>100 g de sucre roux</li><li>100 g de miel</li><li>1 œuf</li><li>2 cuillères à café d''épices (cannelle, gingembre, muscade, clou de girofle)</li><li>½ cuillère à café de bicarbonate</li></ul><h3>Préparation</h3><ol><li>Mélangez le beurre, le sucre et le miel, puis ajoutez l''œuf.</li><li>Incorporez la farine, les épices et le bicarbonate, formez une boule et placez-la 1 heure au frais.</li><li>Étalez la pâte sur 5 mm et découpez étoiles, sapins et bonshommes.</li><li>Faites cuire 8 à 10 minutes à 180 °C : les biscuits durcissent en refroidissant.</li></ol><p><strong>Décoration :</strong> 150 g de sucre glace et 1 à 2 cuillères à soupe de jus de citron donnent un glaçage blanc parfait.</p>' },
    @{ Title = 'Défi solidarité : une bonne action'; Body = '<p>Les fêtes sont aussi l''occasion de penser à celles et ceux pour qui décembre est difficile. Le défi du jour : choisir <strong>une</strong> bonne action et la réaliser avant la fin de la semaine.</p><ul><li>Déposer des denrées, des produits d''hygiène ou des jouets en bon état dans une collecte près de chez vous.</li><li>Donner des vêtements chauds : manteaux, gants, bonnets.</li><li>Écrire quelques cartes de vœux pour les résidents d''une maison de retraite.</li><li>Offrir un peu de temps bénévole à une association locale.</li><li>Prendre des nouvelles d''un voisin ou d''un proche isolé.</li><li>Donner son sang : les besoins restent importants pendant les fêtes.</li></ul><p><strong>En équipe :</strong> pourquoi ne pas organiser une collecte commune au bureau ? Les petits gestes, mis bout à bout, font une grande différence.</p>' },
    @{ Title = 'Écologie : l''emballage furoshiki'; Body = '<p>Le papier cadeau brillant ou métallisé ne se recycle généralement pas. L''alternative élégante venue du Japon : le <em>furoshiki</em>, un carré de tissu qui emballe… et se réutilise à l''infini.</p><h3>L''emballage de base</h3><ol><li>Posez le tissu à plat, en losange, et placez le cadeau au centre.</li><li>Rabattez le coin du bas sur le cadeau, puis le coin du haut par-dessus.</li><li>Nouez les deux coins restants sur le dessus avec un double nœud plat.</li></ol><p>Foulard, torchon, chute de tissu : tout carré fait l''affaire, à condition que sa diagonale mesure environ trois fois la largeur du cadeau.</p><p><strong>Bonus :</strong> découpez vos étiquettes dans les cartes de vœux de l''an dernier.</p>'; Link = 'https://fr.wikipedia.org/wiki/Furoshiki'; LinkText = 'En savoir plus sur le furoshiki' },
    @{ Title = 'Jeu d''équipe : la journée du pull moche'; Body = '<p>Rennes à pompons, sapins clignotants, flocons tricotés… Le pull de Noël le plus kitsch devient la tenue officielle de la journée !</p><h3>Comment l''organiser</h3><ol><li>Choisissez une date et annoncez-la quelques jours à l''avance, au bureau comme en visioconférence.</li><li>Pas de pull de Noël ? Un bonnet, une écharpe ou un accessoire fait maison suffit : le but est de s''amuser, pas d''acheter.</li><li>Prenez une photo de groupe.</li><li>Votez dans plusieurs catégories : le plus lumineux, le plus créatif, le plus rétro, le mieux recyclé.</li></ol><p><strong>Idée solidaire :</strong> associez la journée à un petit don libre au profit d''une association choisie par l''équipe.</p>' },
    @{ Title = 'Le saviez-vous ? Le solstice d''hiver'; Body = '<p>Le 21 ou le 22 décembre selon les années, l''hémisphère Nord vit le solstice d''hiver : le jour le plus court et la nuit la plus longue de l''année. À Paris, le soleil ne reste levé qu''un peu plus de 8 heures ; au-delà du cercle polaire, il ne se lève plus du tout.</p><p>Depuis toujours, cette nuit est l''occasion de célébrer le retour de la lumière :</p><ul><li><strong>Yule</strong>, la fête du milieu de l''hiver des peuples germaniques et scandinaves ;</li><li><strong>Dongzhi</strong> en Chine, où l''on partage des boulettes de riz gluant, les <em>tangyuan</em> ;</li><li><strong>Yalda</strong> en Iran, une longue veillée autour de grenades, de pastèques et de poésie.</li></ul><p>Bonne nouvelle : dès le lendemain, les jours rallongent ! Dans l''hémisphère Sud, c''est au contraire le solstice d''été.</p>'; Link = 'https://fr.wikipedia.org/wiki/Solstice_d%27hiver'; LinkText = 'En savoir plus sur le solstice' },
    @{ Title = 'Recette : les truffes au chocolat'; Body = '<p>Faciles, sans cuisson et parfaites à offrir dans une jolie boîte : une vingtaine de truffes en 20 minutes, plus le temps de repos.</p><h3>Ingrédients</h3><ul><li>200 g de chocolat noir</li><li>10 cl de crème liquide entière</li><li>20 g de beurre</li><li>pour l''enrobage : cacao en poudre non sucré, noix de coco râpée ou noisettes concassées</li></ul><h3>Préparation</h3><ol><li>Hachez le chocolat et placez-le dans un saladier.</li><li>Portez la crème à frémissement, versez-la sur le chocolat, attendez 1 minute, puis mélangez doucement.</li><li>Incorporez le beurre et laissez prendre 2 heures au réfrigérateur.</li><li>Formez des billes à l''aide d''une cuillère à café et roulez-les dans l''enrobage choisi.</li></ol><p>Elles se conservent une semaine au frais, dans une boîte hermétique… si elles résistent jusque-là !</p>' },
    @{ Title = 'Noël autour du monde'; Body = '<p>À la veille de Noël, un dernier petit tour du monde des traditions :</p><ul><li><strong>Islande</strong> : le <em>Jólabókaflóð</em>, le « déluge de livres ». On s''offre des livres le soir du 24 décembre et l''on passe la soirée à lire.</li><li><strong>Philippines</strong> : les <em>parol</em>, de grandes lanternes en forme d''étoile, illuminent les rues pendant des semaines.</li><li><strong>Japon</strong> : le soir de Noël se fête plutôt entre amis ou en amoureux, autour d''un gâteau à la crème et aux fraises.</li><li><strong>Catalogne</strong> : le <em>Tió de Nadal</em>, une bûche souriante coiffée d''un bonnet, que les enfants « nourrissent » pendant des jours avant de la tapoter en chantant pour qu''elle livre des friandises.</li><li><strong>Australie</strong> : Noël tombe en plein été, et le repas se prend souvent dehors, parfois même à la plage.</li></ul><p><strong>Et chez vous ?</strong> Partagez avec l''équipe une tradition de votre famille ou de votre région.</p>' },
    @{ Title = 'Joyeuses fêtes !'; Body = '<p>Voici la dernière case : merci d''avoir ouvert ce calendrier avec nous, jour après jour.</p><p>Que ces fêtes vous apportent du repos, de la chaleur et de beaux moments avec celles et ceux qui comptent pour vous, que vous les passiez en famille, entre amis, en voyage ou simplement au calme.</p><p>Une pensée particulière pour les collègues qui travaillent pendant les fêtes pour que tout continue de tourner : merci à vous !</p><p><strong>Très belles fêtes de fin d''année, et rendez-vous l''an prochain pour une nouvelle édition !</strong></p>' }
  )
  en = @(
    @{ Title = 'Welcome to the Advent calendar!'; Body = '<p>Until December 24, a new door opens every day: traditions from around the world, recipes, crafts, riddles, songs and small challenges to share with your team.</p><h3>Did you know?</h3><p>The Advent calendar was born in 19th-century Germany. Families counted down the days to Christmas by drawing a chalk line on a door each evening, lighting a candle or hanging up a small picture.</p><ul><li>The first printed calendars appeared in the early 20th century;</li><li>little doors to open soon became the norm;</li><li>chocolate-filled versions spread in the 1950s.</li></ul><p><strong>Come back every day: past doors remain available, and the ones you have already opened are marked with a check mark.</strong></p>'; Link = 'https://en.wikipedia.org/wiki/Advent_calendar'; LinkText = 'The history of the Advent calendar' },
    @{ Title = 'Recipe: homemade hot chocolate'; Body = '<p>Nothing beats a steaming mug to kick off the season. A quick recipe, ready in 10 minutes.</p><h3>Ingredients (2 mugs)</h3><ul><li>2 cups (500 ml) milk, or oat milk</li><li>3.5 oz (100 g) dark chocolate</li><li>1 tablespoon sugar (optional)</li><li>1 pinch of cinnamon and 1 pinch of salt</li></ul><h3>Method</h3><ol><li>Warm the milk over low heat without letting it boil.</li><li>Take it off the heat, add the chopped chocolate and let it melt for 1 minute.</li><li>Whisk briskly with the sugar, cinnamon and salt until smooth and frothy.</li></ol><p><strong>Tip:</strong> steep a strip of orange zest or a split vanilla pod in the hot milk for 5 minutes. Instant holiday magic!</p>' },
    @{ Title = 'The elf''s riddles'; Body = '<p>Two riddles to wake up your brain before the coffee break. Think carefully before you click!</p><h3>1. The elf''s socks</h3><p>In a pitch-dark drawer, an elf keeps 10 red socks and 10 green socks, all mixed up. How many must he take out, without looking, to be sure of getting a matching pair?</p><details><summary>Show the answer</summary><p><strong>3 socks.</strong> With only two colors, at least two of the three socks are bound to match.</p></details><h3>2. What am I?</h3><p>I am tall when I am young and short when I am old. December is when I shine the most.</p><details><summary>Show the answer</summary><p><strong>A candle!</strong></p></details>' },
    @{ Title = 'Craft: the paper snowflake'; Body = '<p>Five minutes, a sheet of paper and scissors are all you need to decorate a window or a desk. And no two snowflakes will ever be alike!</p><h3>You will need</h3><p>A square sheet of paper (white, brown kraft or recycled) and a pair of scissors.</p><h3>Steps</h3><ol><li>Fold the square in half diagonally to make a triangle, then fold it in half again.</li><li>Fold this triangle into thirds, like a fan: your snowflake will have six arms, just like a real snow crystal.</li><li>Trim off the tip that sticks out, then cut notches, triangles and curves along the edges.</li><li>Unfold carefully… and admire.</li></ol><p><strong>Challenge:</strong> hang your snowflakes in a window with a thread and share a photo with the team.</p>' },
    @{ Title = 'Did you know? The story of Christmas baubles'; Body = '<p>Before baubles, trees were decorated with treats. In 1605, a chronicle from Strasbourg describes trees adorned with paper roses, apples, wafers and sweets.</p><ul><li><strong>Blown glass</strong>: in the mid-19th century, glassblowers in Lauscha, Thuringia (Germany), began making glass ornaments that soon spread across Europe.</li><li><strong>A legend from Lorraine</strong>: in 1858, a drought is said to have left the region without apples, so a glassblower in the northern Vosges blew glass balls to replace them.</li><li><strong>To this day</strong>, glassmakers in Lorraine create a new mouth-blown bauble every year.</li></ul><p>What is the oldest ornament on your tree? It surely has a story to tell.</p>'; Link = 'https://en.wikipedia.org/wiki/Christmas_ornament'; LinkText = 'More about Christmas ornaments' },
    @{ Title = 'Tradition: Saint Nicholas Day'; Body = '<p>On December 6, Saint Nicholas is celebrated in the Netherlands, Belgium, Luxembourg, Germany, Switzerland, eastern and northern France, and much of Central Europe.</p><ul><li><strong>Who was he?</strong> A 4th-century bishop of Myra (in present-day Turkey), known for his generosity, who became the patron saint of children.</li><li><strong>The night before</strong>, children leave their shoes by the fireplace or the door, sometimes with a carrot for his horse or donkey.</li><li><strong>In the morning</strong>: tangerines, gingerbread, chocolate and small gifts.</li></ul><p><strong>Did you know?</strong> The name Santa Claus comes from <em>Sinterklaas</em>, the Dutch name for Saint Nicholas, brought to New York by Dutch settlers.</p>'; Link = 'https://en.wikipedia.org/wiki/Saint_Nicholas_Day'; LinkText = 'More about Saint Nicholas Day' },
    @{ Title = 'Team game: Secret Santa'; Body = '<p>The idea: everyone gives a small gift to a colleague drawn at random, and keeps it secret until exchange day.</p><h3>The rules in 5 steps</h3><ol><li>Set the exchange date and a modest budget, the same for everyone (for example $10 or €10).</li><li>Draw names: a hat, an app or a spreadsheet, as long as nobody gets their own name.</li><li>Ask everyone to jot down two or three wishes or interests.</li><li>Wrap it up and add a kind note… without signing it!</li><li>On the big day, everyone tries to guess who their Secret Santa was.</li></ol><p><strong>Twist:</strong> allow homemade, second-hand or “intangible” gifts (a recipe, a playlist, a book recommendation). It''s the thought that counts.</p>' },
    @{ Title = 'The holiday playlist'; Body = '<p>Old melodies, now in the public domain, that have traveled across centuries and borders. Which one are you already humming?</p><ul><li><strong>Silent Night</strong> (<em>Stille Nacht</em>): first sung on December 24, 1818 in Oberndorf, near Salzburg, with music by Franz Xaver Gruber and words by Joseph Mohr.</li><li><strong>Jingle Bells</strong>: published in 1857 by James Lord Pierpont, originally under the title <em>One Horse Open Sleigh</em>.</li><li><strong>O Christmas Tree</strong> (<em>O Tannenbaum</em>): a German folk song, in Ernst Anschütz''s 1824 version.</li><li><strong>Angels We Have Heard on High</strong>: the English version of a traditional French carol, <em>Les Anges dans nos campagnes</em>.</li><li><strong>Deck the Halls</strong> and <strong>We Wish You a Merry Christmas</strong>: English words on a Welsh tune, and a traditional carol from the West Country of England.</li></ul><p><strong>Your turn:</strong> share your favorite version (choir, jazz, solo piano…) and build the team''s shared playlist.</p>' },
    @{ Title = 'Quiz: Christmas trivia'; Body = '<p>Five questions to test your Christmas knowledge. Write down your answers before revealing them!</p><ol><li>Which country gives London the big Christmas tree in Trafalgar Square every year?</li><li>How many reindeer pull the sleigh in the famous 1823 American poem <em>A Visit from St. Nicholas</em>?</li><li>Which country does the poinsettia come from?</li><li>In Iceland, how many mischievous Yule Lads, the <em>Jólasveinar</em>, visit children before Christmas?</li><li>On which day do the Twelve Days of Christmas begin?</li></ol><details><summary>Show the answers</summary><ol><li><strong>Norway</strong>, every year since 1947, as a thank-you for British support during World War II.</li><li><strong>Eight</strong>.</li><li><strong>Mexico</strong>; it is named after Joel Poinsett, the American diplomat who introduced it to the United States.</li><li><strong>Thirteen</strong>, one each night from December 12.</li><li><strong>December 25</strong>: they run until January 5, the eve of Epiphany.</li></ol></details>' },
    @{ Title = 'Calm: stress-free holidays'; Body = '<p>Gifts, meals, travel, year-end deadlines… December can quickly feel like a marathon. A few ideas to keep smiling:</p><ul><li><strong>Make a list</strong>, then cross out what isn''t essential: “good enough” holidays beat exhausting ones.</li><li><strong>Set a budget</strong> before you start shopping.</li><li><strong>Share the load</strong>: everyone brings a dish, everyone has a role.</li><li><strong>Move a little</strong>: a ten-minute walk in daylight works wonders in winter.</li><li><strong>Keep some time for yourself</strong>: a book, a nap, a screen-free evening.</li></ul><p><strong>Try this:</strong> 4-6 breathing. Breathe in through your nose for a count of 4, then breathe out gently through your mouth for a count of 6, for one or two minutes.</p>' },
    @{ Title = 'Did you know? The Yule log'; Body = '<p>Long before it was a dessert, the Yule log was… a real log!</p><ul><li><strong>An ancient tradition</strong>: in many parts of Europe, families chose a large log and burned it in the hearth on Christmas Eve, sometimes for several days.</li><li><strong>A lucky charm</strong>: the log was blessed or sprinkled with wine, and its ashes were kept to protect the house.</li><li><strong>The cake</strong>: as stoves replaced large fireplaces, 19th-century Parisian pastry chefs popularized the <em>bûche de Noël</em>, a rolled sponge cake decorated like bark, with meringue mushrooms and a dusting of powdered-sugar snow.</li></ul><p><strong>The big team debate:</strong> chocolate, praline, berry or ice-cream Yule log?</p>' },
    @{ Title = 'Craft: a dried orange garland'; Body = '<p>A natural, fragrant, plastic-free decoration that goes straight into the compost after the holidays.</p><h3>You will need</h3><ul><li>2 or 3 oranges (or clementines)</li><li>kitchen twine or raffia</li><li>a few cinnamon sticks and star anise pods (optional)</li></ul><h3>Steps</h3><ol><li>Cut the oranges into ¼-inch (5 mm) slices and pat them dry with a clean towel.</li><li>Lay them on a baking sheet lined with parchment paper and dry them in the oven at 200 °F (90 °C) for 2 to 3 hours, turning them every 30 minutes.</li><li>Let them cool, then thread them onto the twine, alternating with cinnamon and star anise.</li></ol><p><strong>Tip:</strong> with a short piece of twine, a single slice also makes a lovely gift-wrap decoration.</p>' },
    @{ Title = 'Tradition: Saint Lucy''s Day in Sweden'; Body = '<p>On December 13, Sweden celebrates Lucia, the bringer of light, in the darkest part of the year.</p><ul><li><strong>The procession</strong>: dressed in a long white gown tied with a red sash, Lucia wears a crown of candles. She is followed by girls each holding a candle and by boys in tall pointed hats decorated with stars.</li><li><strong>The songs</strong>: the procession visits schools, churches, care homes and even offices, singing as it goes.</li><li><strong>The treats</strong>: S-shaped saffron buns called <em>lussekatter</em>, and gingerbread cookies.</li></ul><p><strong>Did you know?</strong> Under the old Julian calendar, December 13 fell around the winter solstice: the longest night of the year.</p>'; Link = 'https://en.wikipedia.org/wiki/Saint_Lucy%27s_Day'; LinkText = 'More about Saint Lucy''s Day' },
    @{ Title = 'Holiday books and films'; Body = '<p>For long winter evenings, a few great classics to discover or rediscover, on your own or with family:</p><ul><li><strong><em>A Christmas Carol</em></strong> (Charles Dickens, 1843): an old miser is visited by three spirits in a single night. A tale about generosity, adapted for the screen dozens of times.</li><li><strong><em>The Nutcracker and the Mouse King</em></strong> (E. T. A. Hoffmann, 1816): the story behind Tchaikovsky''s ballet, first performed in Saint Petersburg in 1892.</li><li><strong><em>The Fir-Tree</em></strong> (Hans Christian Andersen, 1844): a short, moving tale to read aloud.</li><li><strong><em>It''s a Wonderful Life</em></strong> (Frank Capra, 1946): a black-and-white film that has become a year-end ritual in many homes.</li></ul><p><strong>What about you?</strong> Share with the team the book or film that tastes like Christmas to you.</p>'; Link = 'https://en.wikipedia.org/wiki/A_Christmas_Carol'; LinkText = 'About “A Christmas Carol”' },
    @{ Title = 'Christmas jokes'; Body = '<p>A little humor to celebrate the halfway mark! Read the question, guess the punchline, then click.</p><p><strong>Why are Christmas trees so bad at sewing?</strong></p><details><summary>Show the answer</summary><p>Because they always drop their needles!</p></details><p><strong>What did one snowman say to the other snowman?</strong></p><details><summary>Show the answer</summary><p>“Can you smell carrots?”</p></details><p><strong>What is the fear of getting stuck in a chimney called?</strong></p><details><summary>Show the answer</summary><p>Claus-trophobia!</p></details><p><strong>Your turn:</strong> what is your best (or worst) Christmas joke? Share it with the team: groans and eye-rolls are part of the fun!</p>' },
    @{ Title = 'Tradition: Las Posadas in Mexico'; Body = '<p>From December 16 to 24, Mexico celebrates <em>las posadas</em>: nine evenings of neighborhood festivities, one for each month of Mary''s pregnancy.</p><ul><li><strong>The procession</strong>: each evening, a group re-enacts Mary and Joseph''s search for shelter. Outside a house, the “pilgrims” sing to ask for lodging; the hosts sing back from inside… until the door finally opens.</li><li><strong>The piñata</strong>: traditionally shaped like a seven-pointed star, it is broken blindfolded to release a shower of fruit and sweets.</li><li><strong>The <em>ponche</em></strong>: a hot fruit punch (guava, apple, sugar cane) flavored with cinnamon, served with tamales.</li></ul><p><em>Posada</em> means “inn” in Spanish. The tradition is also alive in Guatemala and in many Hispanic communities across the United States.</p>'; Link = 'https://en.wikipedia.org/wiki/Las_Posadas'; LinkText = 'More about Las Posadas' },
    @{ Title = 'Recipe: spiced cookies'; Body = '<p>The smell of ginger and cinnamon means Christmas is near! Makes about thirty cut-out cookies.</p><h3>Ingredients</h3><ul><li>2 cups (250 g) all-purpose flour</li><li>7 tablespoons (100 g) softened butter</li><li>½ cup (100 g) packed brown sugar</li><li>⅓ cup (100 g) honey</li><li>1 egg</li><li>2 teaspoons ground spices (cinnamon, ginger, nutmeg, cloves)</li><li>½ teaspoon baking soda</li></ul><h3>Method</h3><ol><li>Cream the butter, sugar and honey, then beat in the egg.</li><li>Mix in the flour, spices and baking soda, shape into a ball and chill for 1 hour.</li><li>Roll the dough out to ¼ inch (5 mm) and cut out stars, trees and gingerbread people.</li><li>Bake for 8 to 10 minutes at 350 °F (180 °C): the cookies firm up as they cool.</li></ol><p><strong>Decorating:</strong> 1¼ cups (150 g) powdered sugar mixed with 1 to 2 tablespoons lemon juice makes a perfect white icing.</p>' },
    @{ Title = 'Kindness challenge: one good deed'; Body = '<p>The holidays are also a time to think of those for whom December is hard. Today''s challenge: pick <strong>one</strong> good deed and do it before the end of the week.</p><ul><li>Drop off food, toiletries or toys in good condition at a donation drive near you.</li><li>Donate warm clothes: coats, gloves, hats.</li><li>Write a few holiday cards for the residents of a care home.</li><li>Volunteer some of your time with a local charity.</li><li>Check in on a neighbor or a relative who lives alone.</li><li>Give blood: the need remains high over the holidays.</li></ul><p><strong>As a team:</strong> why not organize a shared collection at the office? Small gestures add up to a big difference.</p>' },
    @{ Title = 'Eco tip: furoshiki gift wrapping'; Body = '<p>Shiny or metallic wrapping paper usually can''t be recycled. An elegant alternative from Japan: <em>furoshiki</em>, a square of fabric that wraps your gift… and can be reused again and again.</p><h3>The basic wrap</h3><ol><li>Lay the cloth flat in a diamond shape and place the gift in the center.</li><li>Fold the bottom corner over the gift, then the top corner over it.</li><li>Tie the two remaining corners on top with a square knot.</li></ol><p>A scarf, a tea towel, a fabric remnant: any square works, as long as its diagonal is about three times the width of the gift.</p><p><strong>Bonus:</strong> cut your gift tags out of last year''s greeting cards.</p>'; Link = 'https://en.wikipedia.org/wiki/Furoshiki'; LinkText = 'More about furoshiki' },
    @{ Title = 'Team game: ugly sweater day'; Body = '<p>Pompom reindeer, flashing trees, knitted snowflakes… The tackiest holiday sweater becomes the official dress code of the day!</p><h3>How to run it</h3><ol><li>Pick a date and announce it a few days ahead, for people in the office and on video calls alike.</li><li>No holiday sweater? A hat, a scarf or a homemade accessory will do: the goal is to have fun, not to go shopping.</li><li>Take a group photo.</li><li>Vote in several categories: brightest, most creative, most retro, best upcycled.</li></ol><p><strong>Give back:</strong> pair the day with an optional small donation to a charity chosen by the team.</p>' },
    @{ Title = 'Did you know? The winter solstice'; Body = '<p>On December 21 or 22, depending on the year, the Northern Hemisphere reaches the winter solstice: the shortest day and the longest night of the year. In London, the sun is up for less than 8 hours; north of the Arctic Circle, it does not rise at all.</p><p>For thousands of years, this night has been a time to celebrate the return of the light:</p><ul><li><strong>Yule</strong>, the midwinter festival of the Germanic and Scandinavian peoples;</li><li><strong>Dongzhi</strong> in China, where families share sweet rice balls called <em>tangyuan</em>;</li><li><strong>Yalda</strong> in Iran, a long night spent with pomegranates, watermelon and poetry.</li></ul><p>Good news: from the very next day, the days start getting longer! In the Southern Hemisphere, it is the summer solstice instead.</p>'; Link = 'https://en.wikipedia.org/wiki/Winter_solstice'; LinkText = 'More about the solstice' },
    @{ Title = 'Recipe: chocolate truffles'; Body = '<p>Easy, no-bake and perfect for gifting in a pretty box: about twenty truffles in 20 minutes, plus chilling time.</p><h3>Ingredients</h3><ul><li>7 oz (200 g) dark chocolate</li><li>scant ½ cup (100 ml) heavy cream</li><li>1½ tablespoons (20 g) butter</li><li>for coating: unsweetened cocoa powder, shredded coconut or chopped hazelnuts</li></ul><h3>Method</h3><ol><li>Chop the chocolate and put it in a bowl.</li><li>Bring the cream to a simmer, pour it over the chocolate, wait 1 minute, then stir gently.</li><li>Stir in the butter and chill for 2 hours.</li><li>Scoop out small balls with a teaspoon and roll them in the coating of your choice.</li></ol><p>They keep for a week in an airtight box in the fridge… if they last that long!</p>' },
    @{ Title = 'Christmas around the world'; Body = '<p>On the eve of Christmas Eve, one last trip around the world''s traditions:</p><ul><li><strong>Iceland</strong>: <em>Jólabókaflóð</em>, the “Christmas book flood”. People give each other books on December 24 and spend the evening reading.</li><li><strong>Philippines</strong>: <em>parol</em>, large star-shaped lanterns, light up the streets for weeks.</li><li><strong>Japan</strong>: Christmas Eve is mostly celebrated with friends or as a couple, over a strawberry and cream sponge cake.</li><li><strong>Catalonia</strong>: the <em>Tió de Nadal</em>, a smiling log wearing a little hat, which children “feed” for days before tapping it while singing so that it delivers sweets.</li><li><strong>Australia</strong>: Christmas falls in midsummer, and the meal is often eaten outdoors, sometimes even on the beach.</li></ul><p><strong>What about you?</strong> Share a tradition from your family or your region with the team.</p>' },
    @{ Title = 'Happy holidays!'; Body = '<p>Here is the last door: thank you for opening this calendar with us, day after day.</p><p>May the holidays bring you rest, warmth and wonderful moments with the people who matter to you, whether you spend them with family, with friends, on the road or simply enjoying some quiet time.</p><p>A special thought for the colleagues who work over the holidays to keep things running smoothly: thank you!</p><p><strong>Happy holidays, and see you next year for a new edition!</strong></p>' }
  )
}
$contents = $allContents[$Language]

# ---------------------------------------------------------------- Days to write
# Existing posts of the edition, by day (a day has at most one post per edition: AdvKey = YYYY-DD is unique).
$editionQuery = "<View><Query><Where><Eq><FieldRef Name='AdvYear'/><Value Type='Number'>$Year</Value></Eq></Where></Query><RowLimit>100</RowLimit></View>"
$existingByDay = @{}
foreach ($item in @(Get-PnPListItem -List $publicationsList -Query $editionQuery)) {
  $existingDay = [int]$item['AdvDay']
  if (-not $existingByDay.ContainsKey($existingDay)) {
    $existingByDay[$existingDay] = $item.Id
  }
}

$daysToWrite = @()
$skippedDays = @()
for ($day = 1; $day -le 24; $day++) {
  if ($existingByDay.ContainsKey($day) -and -not $Overwrite) {
    $skippedDays += $day
  } else {
    $daysToWrite += $day
  }
}
if ($skippedDays.Count -gt 0) {
  Write-Host "$($skippedDays.Count) day(s) of the $Year edition already have a post and are left unchanged: $($skippedDays -join ', '). Use -Overwrite to replace them." -ForegroundColor Yellow
}

# ---------------------------------------------------------------- Illustrations (Site Assets / AdventCalendarDemo)
# Same files and same folder as the import from Administration › Posts (services/DefaultContentService.ts).
$illustrationsPath = Join-Path $PSScriptRoot '../src/webparts/adventCalendar/assets/demo'
$demoFolderName = 'AdventCalendarDemo'
$imageUrls = @{}
if ($daysToWrite.Count -gt 0 -and $PSCmdlet.ShouldProcess("Site Assets/$demoFolderName", "Upload the illustrations of $($daysToWrite.Count) day(s), overwriting files with the same name")) {
  if (Test-Path -LiteralPath $illustrationsPath) {
    Write-Host "Uploading $($daysToWrite.Count) illustration(s) to Site Assets/$demoFolderName…" -ForegroundColor Cyan
    try {
      $context = Get-PnPContext
      $web = Get-PnPWeb
      $siteAssets = $context.Web.Lists.EnsureSiteAssetsLibrary()
      $context.Load($siteAssets.RootFolder)
      Invoke-PnPQuery
      $libraryUrl = $siteAssets.RootFolder.ServerRelativeUrl.TrimEnd('/')
      $webUrl = $web.ServerRelativeUrl.TrimEnd('/')
      $folderSiteRelative = "$($libraryUrl.Substring($webUrl.Length).TrimStart('/'))/$demoFolderName"
      Resolve-PnPFolder -SiteRelativePath $folderSiteRelative | Out-Null
      $origin = ([Uri]$web.Url).GetLeftPart([UriPartial]::Authority)

      foreach ($day in $daysToWrite) {
        $fileName = 'day-{0:D2}.svg' -f $day
        try {
          # Add-PnPFile overwrites a file with the same name.
          Add-PnPFile -Path (Join-Path $illustrationsPath $fileName) -Folder $folderSiteRelative | Out-Null
          $imageUrls[$day] = "$origin$libraryUrl/$demoFolderName/$fileName"
        } catch {
          Write-Warning "Day ${day}: illustration not uploaded ($($_.Exception.Message)). The post is saved without a new image."
        }
      }
    } catch {
      Write-Warning "Site Assets library not available ($($_.Exception.Message)). The posts are saved without images."
    }
  } else {
    Write-Warning "Folder $illustrationsPath not found: the posts are saved without images."
  }
}

# ---------------------------------------------------------------- Posts
$created = 0
$replaced = 0
foreach ($day in $daysToWrite) {
  $content = $contents[$day - 1]
  $values = @{
    Title         = $content.Title
    AdvDay        = $day
    AdvYear       = $Year
    AdvKey        = '{0}-{1:D2}' -f $Year, $day
    AdvUnlockDate = [DateTime]::new($Year, 12, $day, 0, 0, 0, [DateTimeKind]::Local)
    AdvBody       = $content.Body
    AdvPublished  = -not ($DraftDays -contains $day)
  }
  if ($content.ContainsKey('Link')) {
    $values.AdvLink = "$($content.Link), $($content.LinkText)"
  } elseif ($existingByDay.ContainsKey($day)) {
    # -Overwrite: the demo post has no link, so the link of the replaced post is cleared.
    $values.AdvLink = $null
  }
  if ($imageUrls.ContainsKey($day)) {
    $values.AdvImage = "$($imageUrls[$day]), $($content.Title)"
  }

  if ($existingByDay.ContainsKey($day)) {
    if ($PSCmdlet.ShouldProcess("Day $day of the $Year edition", 'Replace the post with the demo post')) {
      Set-PnPListItem -List $publicationsList -Identity $existingByDay[$day] -Values $values | Out-Null
      $replaced++
      Write-Host "  Day $day replaced"
    }
  } elseif ($PSCmdlet.ShouldProcess("Day $day of the $Year edition", 'Create the demo post')) {
    Add-PnPListItem -List $publicationsList -Values $values | Out-Null
    $created++
    Write-Host "  Day $day created"
  }
}

# ---------------------------------------------------------------- Theme profile
$profileTitle = if ($Language -eq 'fr') { 'Classique' } else { 'Classic' }
$headerTitle = if ($Language -eq 'fr') { "Notre calendrier de l'Avent $Year" } else { "Our Advent calendar $Year" }
$profileValues = @{
  Title              = $profileTitle
  # Values of the "Classic" template (CLASSIC_PRESET, defaults/themes/themePresets.ts) = default theme of the web part.
  AdvPrimaryColor    = '#1B5E3F'
  AdvSecondaryColor  = '#2E7D5B'
  AdvAccentColor     = '#B3261E'
  AdvBackgroundColor = '#EEF3EE'
  AdvTextColor       = '#16231B'
  AdvLockedColor     = '#DCE3DD'
  # Tree: foliage, baubles (3 to 6 comma-separated colors), star, sky, scenery (day | snow | night), string lights.
  AdvTreeColor       = '#1F6B45'
  AdvBaubleColors    = '#B3261E,#D4A62A,#F4EFE4,#1F4E8C'
  AdvStarColor       = '#E8B923'
  AdvSceneBackground = '#CFE3F0'
  AdvSceneStyle      = 'day'
  AdvGarlandLights   = $true
  AdvFontFamily      = '"Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif'
  AdvHeaderTitle     = $headerTitle
  AdvBorderRadius    = 8
  AdvSnowEffect      = $true
}

$activeQuery = "<View><Query><Where><Eq><FieldRef Name='AdvIsActive'/><Value Type='Boolean'>1</Value></Eq></Where></Query></View>"
$activeProfiles = @(Get-PnPListItem -List $settingsList -Query $activeQuery)
$profileQuery = "<View><Query><Where><Eq><FieldRef Name='Title'/><Value Type='Text'>$profileTitle</Value></Eq></Where></Query><RowLimit>1</RowLimit></View>"
$existingProfile = @(Get-PnPListItem -List $settingsList -Query $profileQuery) | Select-Object -First 1

$profileStatus = 'unchanged'
if (-not $existingProfile) {
  # Active only if requested, or if no profile is active yet (the web part then uses the "Classic" template anyway).
  $profileValues.AdvIsActive = [bool]$ActivateProfile -or ($activeProfiles.Count -eq 0)
  if ($PSCmdlet.ShouldProcess("Theme profile `"$profileTitle`"", "Create ($(if ($profileValues.AdvIsActive) { 'active' } else { 'inactive' }))")) {
    $existingProfile = Add-PnPListItem -List $settingsList -Values $profileValues
    $profileStatus = if ($profileValues.AdvIsActive) { 'created (active)' } else { 'created (inactive: another profile is active, use -ActivateProfile)' }
  }
} elseif ($ActivateProfile -and -not [bool]$existingProfile['AdvIsActive']) {
  if ($PSCmdlet.ShouldProcess("Theme profile `"$profileTitle`"", 'Set as the active profile (values kept)')) {
    Set-PnPListItem -List $settingsList -Identity $existingProfile.Id -Values @{ AdvIsActive = $true } | Out-Null
    $profileStatus = 'activated'
  }
} else {
  Write-Host "The `"$profileTitle`" profile already exists and is left unchanged." -ForegroundColor Yellow
}

# Only one active profile at a time: with -ActivateProfile, the other active profiles are deactivated.
if ($ActivateProfile -and $existingProfile) {
  foreach ($item in $activeProfiles | Where-Object { $_.Id -ne $existingProfile.Id }) {
    if ($PSCmdlet.ShouldProcess("Theme profile `"$($item['Title'])`"", 'Deactivate')) {
      Set-PnPListItem -List $settingsList -Identity $item.Id -Values @{ AdvIsActive = $false } | Out-Null
    }
  }
}

if ($WhatIfPreference) {
  Write-Host "WhatIf: nothing was written." -ForegroundColor Green
} else {
  Write-Host "Done ($Year, $Language): $created post(s) created, $replaced replaced, $($skippedDays.Count) left unchanged; `"$profileTitle`" profile $profileStatus." -ForegroundColor Green
}
if ((Get-Date) -lt [DateTime]::new($Year, 12, 1)) {
  Write-Host "Tip: outside December, turn on `"Test mode: simulate today's date`" in the web part property pane (page in edit mode)." -ForegroundColor Yellow
}
