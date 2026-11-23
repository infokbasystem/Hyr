# Hyr - Fullstack Solution

Detta är ett monorepo som innehåller både backend och frontend för Hyr-applikationen.

## 🏗 Projektstruktur

- **/backend**: Backend byggd med .NET 9. Innehåller REST API-logik och databasintegrationer.
- **/frontend**: Frontend byggd med React (JavaScript).

## 🚀 Komma igång

### Förutsättningar
- [.NET 9 SDK](https://microsoft.com)
- [Node.js](https://nodejs.org) (senaste LTS rekommenderas)
- [Visual Studio Code](https://visualstudio.com)

### Köra projektet i VS Code
Det enklaste sättet att utveckla är att använda de förkonfigurerade debug-inställningarna:

1. Öppna mappen `Hyr` i VS Code.
2. Gå till fliken **Run and Debug** (Ctrl+Shift+D).
3. Välj **"Kör hela Hyr"** i rullistan.
4. Tryck **F5**.

Detta kommer att:
- Bygga och starta .NET-API:et (öppnar Swagger på `/swagger`).
- Starta React-utvecklingsservern.
- Öppna Chrome automatiskt mot frontend.

## 🛠 Utveckling

### Backend (API)
- Projektfil: `backend/backend.csproj`
- Solution: `Hyr.sln`
- Dokumentation: Nås via `/swagger` vid körning.
- Tester: `dotnet test backend.Tests/backend.Tests.csproj` kör tester för prisberäkning och bokningens beräknings-API med en isolerad databas i minnet.

### Prisberäkning av bokningar
- Fordon använder kategoripriser och kräver en prislista samt Faktisk från, precis som tidigare.
- Övriga artiklar använder artikelns egna dygns-, vecko- och månadspriser. Timpriser används inte. Prislista krävs inte för en bokning utan fordon. Blandade bokningar beräknar båda typerna.
- Bodar och liftar har redigerbara priser på bokningsraden. För äldre liftbokningar där alla fyra bokningspriser är tomma används liftens aktuella priser tills ett bokningspris sparas. För att nollställa alla priser på en tidigare prissatt lift måste minst ett pris anges som 0.
- Varje direktprissatt artikel använder sina egna faktiska datum, annars bokade datum. Baspris läggs till en gång per artikel. Hela periodens kostnad jämförs med enbart dygnspris, enbart veckopris respektive enbart månadspris; endast det billigaste alternativet används. Hyrespristyper blandas inte. Noll och tomma priser är inte tillgängliga alternativ; negativa priser avvisas.
- Dygn avser 24 debiterbara timmar, med avrundning uppåt. Vecka täcker sju kalenderdagar och månad löper till motsvarande datum nästa månad (sista dagen om datumet saknas). En större enhet får täcka återstående tid när det blir billigare.
- Kalendern gäller direktprissatta artiklar: Alla dagar, Vardagar (måndag–fredag) eller Arbetsdagar (måndag–fredag utan svenska allmänna helgdagar). Aftnar räknas inte som helgdagar. Vecko- och månadsperioder förlängs inte av undantagna dagar.
- Saknas debiterbar tid tas ingen hyresavgift ut; eventuellt baspris kvarstår. Endast baspris räcker inte för en period med debiterbar hyrestid.
- Omberäkning ersätter ej fakturerade beräkningar och behåller fakturerad historik med avdrag per artikel. Direkta kilometer- och bränsleavgifter för andra artiklar än fordon ingår inte.

### Frontend (Web)
- Baserad på React.
- Hanteras via npm inuti mappen `frontend`.
- För att installera paket: `cd frontend && npm install --legacy-peer-deps`.
- Vid webbläsarbredder på högst 1700 px skalas appen till 90 %. Över 1700 px används normal skala; ändringen sker automatiskt när fönstret ändrar storlek och påverkar inte utskrift.
- Helsideslayouter kompenserar för skalningen så att de fortfarande fyller hela fönstrets höjd.
- Planeringsvyerna för fordon och bodar använder samma zoomkompenserade fönsterhöjd så att den horisontella rullningslisten ligger kvar längst ned.
- Tidslinjer utan timindelning visar bokningar över hela start- och slutdagen, även när sluttiden är midnatt, utan att ändra sparade tider. Bokningar som visas på samma dag placeras i separata rader inom objektet; timindelade vyer behåller exakta tider.
- Planeringens första vyalternativ **Kund** öppnar `CustomerOverview`: alla bokade och utlämnade objekt som ännu inte återlämnats, inklusive framtida bokningar, grupperade per kund. **Utlämnad** är valt som standard. Vyn kan filtreras på kund/objekt/plats, leveransplats och samma statusar som tidslinjerna. Objektkort öppnar bokningen och **Uppdatera** hämtar aktuella uppgifter. Data hämtas kontorsavgränsat från `/api/planning/customer-rentals`; återlämnade, incheckade och odaterade utkast visas inte.
- Tidslinjerna och kundöversikten visar layoutskelett först när inläsningen tar mer än 200 ms. Bakgrundsladdning av fler bokningar visar efter samma fördröjning en diskret laddningsremsa utan att blockera tidslinjen. `PLANNING_TEST_LOADING_DELAY_MS` i `frontend/src/lib/planningLoading.js` är satt till `0` för normal laddning; sätt den till `2000` för att testa skeletten i utvecklingsläge. Produktionsbyggen använder aldrig testfördröjningen. Animationerna stängs av när minskad rörelse är vald.
- Kundsökning i bokningar och fakturor visar **Ny kund** när sökningen inte ger några träffar. Dialogen använder kundsidans formulär och väljer den sparade kunden automatiskt utan att lämna sidan.

### E-post med faktura eller bokning
- Öppna dokumentets PDF och välj **Maila**. Dialogen bifogar den visade PDF:en, låter användaren redigera mottagare och HTML-text samt lägga till, döpa om och ta bort extra bilagor. Kundens e-postadress väljs för fakturor; för bokningar väljs bokningens och kundens adresser utan dubbletter. Kontorets och den inloggade användarens adresser föreslås som omarkerade kopiemottagare. Minst en Till- eller Kopia-mottagare måste väljas.
- Dialogen öppnas direkt medan standarduppgifterna hämtas. Redigerade fält skrivs inte över av sena svar. Skicka aktiveras när hämtningen är klar eller när användaren väljer **Fortsätt manuellt** vid lång inläsning.
- Kontorets e-posttexter `INVOICE` och `RESERVATION` används för respektive dokument. Tomma fält får en dokumentspecifik standardtext. Platshållarna `[FAKTNR]`, `[AONR]`, `[FTGNAMN]`, `[invoiceNr]`, `[workorderNr]`, `[reservationNr]` och `[officeName]` kan även skrivas med `{...}` eller `{{...}}`; nummer ersätts med det aktuella dokumentnumret och företagsnamn med kontorets namn. Saknade kund-, kontors- eller malluppgifter visas som en varning och kan fyllas i manuellt eller hämtas igen genom att öppna dialogen på nytt.
- Servern läser `Smtp:Host`, `Port`, `UseStartTls`, `UserName`, `Password`, `FromAddress` och `FromName` från `backend/appsettings.json` eller vanliga .NET-konfigurationsöverstyrningar. Använd serverägd konfiguration och miljövariabler som `Smtp__Password` för hemligheter; checka inte in SMTP-uppgifter. `deployment/appsettings.template.json` innehåller samma nycklar. `UseStartTls: true` kräver STARTTLS; annars väljer MailKit säkerhetsläge automatiskt. SMTP-användarnamn och lösenord behövs endast när servern kräver autentisering.
- `POST /api/email/send` kräver inloggning och ett dokument i användarens kontor. Multipart-fälten är `subject`, `body`, `receivers`, `ccRecipients`, `files` samt exakt ett av `invoiceId` eller `reservationId`. Mottagarlistorna är JSON-arrayer med `email` och `doSend`; den första filen är PDF:en. Hela anropet, inklusive multipart-överhead, får vara högst **25 000 000 byte**.
- En faktura markeras som mailad först efter att SMTP-servern accepterat meddelandet. Om e-post har accepterats men statusen inte kan sparas visas en särskild varning; skicka inte om meddelandet utan att först kontrollera resultatet. Även vid ett avbrutet eller obekräftat SMTP-anrop bör leveransen kontrolleras innan ett nytt försök. Tinks separata betalningsmeddelanden och mobilens kontaktlänkar ändras inte.

### Placering av hyrda objekt
- Bokningssidan har en alltid synlig knapp **Placering** i knappraden som öppnar en dialog nära sidans överkant med adressfälten Gata, Postnr och Ort samt en karta (Leaflet med OpenStreetMap). Adressen kan sökas (Enter eller **Sök adress**; ingen sökning vid varje tangenttryckning), och exakt position sätts genom att klicka i kartan eller dra nålen. Adressen förifylls från den valda kunden om bokningen inte redan har någon placering. **Rensa** tar bort placeringen. Till höger i bokningshuvudet visas en liten kartbild med nålen när koordinater är valda; klicka på kartbilden för att öppna dialogen.
- Placeringen sparas per bokning i `PlacementStreet`, `PlacementZipCode`, `PlacementCity`, `PlacementLatitude` och `PlacementLongitude` (`decimal(9,6)`). Koordinaterna sparas båda eller inga; latitud ligger mellan -90 och 90 och longitud mellan -180 och 180.
- Adresssökningen går via backend (`GET /api/geocoding/search`, kräver inloggning) som anropar Nominatim med cache, högst en förfrågan per sekund och tidsgräns. Nominatims användarvillkor kräver en identifierande `UserAgent`: ersätt kontaktuppgiften i `Geocoding:UserAgent` i serverns `appsettings` (se [`deployment/appsettings.template.json`](./deployment/appsettings.template.json)). Kundadresser skickas därmed till den publika Nominatim-tjänsten; byt `Geocoding:BaseUrl` mot egen instans vid behov.
- Kartrutorna hämtas från OpenStreetMaps publika rutnät, som endast är avsett för måttlig användning. Sätt `VITE_MAP_TILE_URL` och `VITE_MAP_ATTRIBUTION` vid frontendbygget för att använda en annan kartleverantör.
- Migrationen `Reservation_PlacementLocation` måste köras före publicering av backend. Den lägger till de fem kolumnerna; befintliga bokningar får tom placering.

### Artiklar per kategori
- På kategorisidan läggs artiklar till via **Välj artikel...** och visas som rader med **Antal** och **Ta bort rad**. Samma artikel kan ingå i flera kategorier men bara en gång per kategori; kopplingarna sparas i `CategoryArticle`. Antal är positivt, tillåter högst fem decimaler och är 1 från början.
  API:t validerar gränsvärdena för antal oberoende av serverns språkinställning.
- När en ny bokningsrad sparas kopieras kategoriartiklarna och deras antal till `ReservationItemArticle`. Även inaktiva, uttryckligen kopplade artiklar följer med. Befintliga bokningsrader ändras inte när kategorins kopplingar eller antal ändras, och äldre bokningar fylls inte på automatiskt.
- På bokningens bod- och liftrader visas artiklarna till höger med antal och redigerbart à-pris. När en bod eller lift väljs hämtas kategoriartiklarna direkt; byte av objekt ersätter listan med det nya objektets kategoriartiklar. Nya rader använder samma artikelsökning som fakturor; efter val visas en etikett. À-priset förifylls från artikeln och sparas som en bokningsspecifik kopia. Senare ändringar av artikelns katalogpris ändrar inte bokningen. Noll är ett giltigt pris; saknat pris måste fyllas i före sparande.
- Boknings-API:ets valfria `articleSelections` per bokningsrad ersätter artikelkopplingarna med `[{"articleId": 1, "quantity": 2, "unitPrice": 15}]`; `[]` tar bort alla. Om samlingen utelämnas behålls befintliga kopplingar, eller kopieras från kategorin för nya rader. Utelämnat/null `unitPrice` behåller befintligt pris; nya kopplingar förifylls från artikeln. `reservationItemArticles` är den sparade listan i svaret, inklusive varje rads stabila `id` och `unitPrice`.
- Artikelkostnaden beräknas en gång per bokningsartikel som antal × bokningens à-pris, avrundat till fem decimaler. Hyresperiodens dagar multipliceras inte med artikelkostnaden. Artikelns moms används om den finns, annars kontorets standardmoms. Omberäkning ersätter ej fakturerade beräkningar och drar av tidigare fakturerade artikelbelopp separat per källrad och momssats, även när artikeln tagits bort från boden.
- Varje artikelkostnad och dess avdrag sparar källans `ReservationItemArticleId` i `ReservationCalcItem` och returnerar `reservationItemArticleId` i beräknings-API:et. Detta är ett historiskt käll-ID, inte en främmande nyckel: artikelrader får tas bort utan att länken i beräkningshistoriken raderas. Befintliga artiklar överförs med rätt artikelnummer och konto till fakturautkast; borttagna källrader behåller beräkningens text, belopp och moms som fritextrader.
- En artikel som används på en bokningsrad kan inte raderas; inaktivera den i stället. När bokningsraden raderas tas dess artikelkopplingar bort.
- API: `/api/itemcategory/form-options` hämtar kontorets artikelval. Kategorins `articles` läses och sparas som `[{"articleId": 1, "quantity": 2}]` via befintliga kategori-API:er. `articles: []` tar bort alla kopplingar. Äldre anrop med `articleIds` stöds fortfarande och behåller befintliga antal; nya kopplingar får antal 1. Om båda fälten utelämnas behålls kopplingar och antal.
- Databasmigrationerna för `CategoryArticle`, `ReservationItemArticle` och `CategoryArticle_Quantity` måste köras separat före publicering av backend. Antalsmigrationen sätter antal 1 på befintliga kopplingar.
- Migrationen `ReservationItemArticle_UnitPrice_Id` måste också köras före publicering. Den bevarar befintliga artikelkopplingar, ger dem identitets-ID:n och förifyller deras à-pris från artikelregistret (saknat katalogpris lämnas tomt). Den lägger även till historiskt käll-ID på beräkningsrader; äldre beräkningsrader lämnas oförändrade.

## 🤖 AI Context (för Claude/GitHub Copilot)
Detta projekt är ett monorepo. Vid ändringar som rör datamodeller, se till att uppdatera både C#-klasserna i `backend` och motsvarande API-anrop/logik i `frontend`.

## Publicering till produktion (IIS)

[`deploy.sh`](./deploy.sh) bygger lokala artefakter för manuell kopiering till två separata IIS-webbplatser:

- `deploy/backend`: backend för Windows x64, Release och framework-dependent.
- `deploy/frontend`: frontend för `https://hyrsys.se`, med API-adressen `https://api.hyrsys.se/api`.

Skriptet överför inga filer, startar inte om IIS och uppdaterar inte SQL Server. Databasändringar hanteras separat, före start av en backend som kräver ett nytt schema. Backend kör inte EF-migrationer automatiskt vid start.

### Bygga artefakter

Kräver Bash, .NET 9 SDK för backend och Node.js/npm för frontend (Node.js 22.12+ rekommenderas). Kör från valfri katalog:

```bash
./deploy.sh
./deploy.sh --api-only
./deploy.sh --web-only
./deploy.sh --web-only --skip-install
./deploy.sh --web-only --api-url https://api.hyrsys.se/api
./deploy.sh --include-config
```

- Båda delarna byggs som standard. `--api-only` och `--web-only` kan inte kombineras.
- Frontend använder `npm ci --legacy-peer-deps` och den incheckade låsfilen. Flaggan behövs för `react-switch-selector`, vars React peer dependency är äldre än projektets React-version.
- `--skip-install` förutsätter att korrekta beroenden redan är installerade.
- API-adressen sätts uttryckligen vid bygget; utvecklingsvärdet i `frontend/.env` ändras inte och används inte i dessa artefakter. `--api-url` kräver en absolut HTTPS-adress utan inloggningsuppgifter, query eller fragment. Vid byte av domän behöver även backendens CORS, IIS-bindningar och integrationsinställningar kontrolleras separat.
- Normala byggen innehåller **inte** `web.config` eller backendens `appsettings*.json`.
- `--include-config` är för första installationen: backend får genererad IIS-konfiguration och en säker inställningsmall från [`deployment/appsettings.template.json`](./deployment/appsettings.template.json); frontend får SPA-konfiguration från [`deployment/frontend.web.config`](./deployment/frontend.web.config). Utvecklingsinställningar och lokala databasuppgifter kopieras aldrig.
- Alla valda delar byggs i tillfälliga kataloger innan tidigare artefakter ersätts. Ett misslyckat bygge behåller tidigare artefakter. Ett delbygge lämnar den andra delens artefakter orörda; kopiera endast delarna som byggts i den aktuella körningen.
- `deploy/` är ignorerad av Git. Använd `./deploy.sh --help` för alla alternativ.

### Första installationen på IIS

1. Installera ASP.NET Core **Hosting Bundle** för .NET 9 på servern (och starta om IIS enligt installationsanvisningarna). Backend kräver x64-runtime. .NET 9 är inte längre supportad; uppgradering till en supportad .NET-version bör hanteras separat.
2. Skapa separata webbplatser för `hyrsys.se` och `api.hyrsys.se`, med HTTPS-bindningar och giltiga certifikat. Backendens applikationspool ska använda **No Managed Code** och ha **Enable 32-Bit Applications = False**. Sätt miljön till `Production` om servern har en annan miljö angiven.
3. Aktivera IIS **Static Content** och installera **URL Rewrite** för frontend. SPA-regeln låter direktlänkar, exempelvis `/login`, öppna React-appen utan att skriva om befintliga filer och kataloger.
4. Bygg med `./deploy.sh --include-config` och kopiera innehållet i respektive artefaktkatalog till rätt webbplats.
5. **Redigera backendens inställningar på servern innan start.** Mallen är inte körklar: ersätt SQL Server-anslutningen med rätt server/databas och produktionsautentisering samt JWT-nyckeln med en kryptografiskt slumpmässig nyckel på minst 32 byte. Behåll avsiktliga issuer/audience-värden. Använd gärna miljövariabler som `ConnectionStrings__DbConnection` och `Jwt__Key` för hemligheter; checka aldrig in produktionshemligheter.
6. Konfigurera SMTP/SMS om de används. Kontrollera Tink-callbacken `https://hyrsys.se/pay/tink/done` och motsvarande registrering hos leverantören. Begränsa filrättigheter så att konfiguration och hemligheter endast är åtkomliga för rätt administratörer och applikationspool.
7. Ge backendens applikationspool åtkomst till SQL Server. Säkerställ separat att databasen redan har rätt schema.
8. Säkerställ beständig **ASP.NET Core Data Protection-nyckellagring** för IIS-identiteten enligt IIS/.NET-anvisningarna, exempelvis med laddad användarprofil. Bevara nycklar och poolidentitet även vid ominstallation; krypterade integrationsuppgifter kan annars bli oläsbara. Nycklar ska inte ligga i en katalog som ersätts vid publicering.

### Uppdatera en befintlig installation

1. Säkerhetskopiera serverns applikationsfiler, konfiguration och databas enligt driftens rutin. Hantera eventuella schemaändringar separat.
2. Kör normalt `./deploy.sh` **utan** `--include-config`.
3. Stoppa backendens applikationspool eller lägg `app_offline.htm` i backendens webbplatsrot innan kopiering, så att låsta filer kan ersättas. Kopiera innehållet i `deploy/backend` och/eller `deploy/frontend` till rätt webbplats.
4. Bevara båda webbplatsernas `web.config`, backendens `appsettings*.json`, miljövariabler, Data Protection-nycklar och annan serverägd data. **Använd inte spegling med radering** som tar bort filer som saknas i artefakterna. Vid första införandet av skriptet: jämför befintlig frontendkonfiguration med SPA-mallen om direktlänkar inte redan fungerar.
5. Ta bort `app_offline.htm` eller starta poolen igen. Kontrollera inloggning, omladdning av en direktlänk i frontend och ett autentiserat API-anrop. Vid fel: kontrollera IIS-/applikationsloggar och återställ tidigare artefakter vid behov. Eventuell återställning av databas kräver en separat bedömning.

## 📱 Mobilversion (`/m`)

Mobilversionen ligger i samma frontend (`frontend/src/mobile/`) men har egna sidor och egen layout. Sidorna laddas separat (lazy loading), så desktopversionen påverkas inte av mobilkoden.

- **Rutter:** `/m/login`, `/m/out` (ute hos kund), `/m/upcoming` (nästa att lämna ut), `/m/available` (lediga nu), `/m/search?from=…&to=…` (lediga under en period) och `/m/reservation/:id` (bokningsdetalj).
- **Automatisk omdirigering:** telefoner skickas till motsvarande `/m`-sida. Via "Desktopversion" i mobilmenyn sätts `localStorage["hyr.preferDesktop"]`, och omdirigeringen stängs då av på den enheten.
- **Bokningsdetalj:** visar kund, kontaktuppgifter, perioder och objekt. Där kan objekt markeras som utlämnade, återlämnade och incheckade. Tillbehör följer alltid sitt fordon. Tider och priser ändras i desktopversionen. Under **Leverans** visas bokningens placering; **Navigera** öppnar Google Maps vägbeskrivning till de sparade koordinaterna. Saknas koordinater visas **Visa på karta** med placeringens adress, annars kundens adress.
- **Backend:** `MobileController` exponerar
  - `GET /api/mobile/available-items?from=&to=` (lediga objekt nu eller för en period)
  - `POST /api/mobile/reservations/{id}/item-status` med `action` = `deliver` | `return` | `checkin`.

  Listorna för ute och utlämning använder de befintliga in/ut-endpoints.
