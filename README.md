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
- Varje direktprissatt artikel använder sina egna faktiska datum, annars bokade datum. Baspris läggs till en gång per artikel. Hela periodens kostnad jämförs med enbart dygnspris, enbart veckopris respektive enbart månadspris; endast det billigaste alternativet används. Hyrespristyper blandas inte. Noll och tomma priser är inte tillgängliga alternativ; negativa priser avvisas.
- Dygn avser 24 debiterbara timmar, med avrundning uppåt. Vecka täcker sju kalenderdagar och månad löper till motsvarande datum nästa månad (sista dagen om datumet saknas). En större enhet får täcka återstående tid när det blir billigare.
- Kalendern gäller direktprissatta artiklar: Alla dagar, Vardagar (måndag–fredag) eller Arbetsdagar (måndag–fredag utan svenska allmänna helgdagar). Aftnar räknas inte som helgdagar. Vecko- och månadsperioder förlängs inte av undantagna dagar.
- Saknas debiterbar tid tas ingen hyresavgift ut; eventuellt baspris kvarstår. Endast baspris räcker inte för en period med debiterbar hyrestid.
- Omberäkning ersätter ej fakturerade beräkningar och behåller fakturerad historik med avdrag per artikel. Direkta kilometer- och bränsleavgifter för andra artiklar än fordon ingår inte.

### Frontend (Web)
- Baserad på React.
- Hanteras via npm inuti mappen `frontend`.
- För att installera paket: `cd frontend && npm install`.

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
