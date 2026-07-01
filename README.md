# Hyr - Fullstack Solution

Detta är ett monorepo som innehåller både backend och frontend för Hyr-applikationen.

## 🏗 Projektstruktur

- **/Hyr.Api**: Backend byggd med .NET 9. Innehåller REST API-logik och databasintegrationer.
- **/Hyr.Web**: Frontend byggd med React (JavaScript).

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
- Projektfil: `Hyr.Api/Hyr.Api.csproj`
- Solution: `Hyr.sln`
- Dokumentation: Nås via `/swagger` vid körning.
- Tester: Kan köras via `dotnet test`.

### Frontend (Web)
- Baserad på React.
- Hanteras via npm inuti mappen `Hyr.Web`.
- För att installera paket: `cd Hyr.Web && npm install`.

## 🤖 AI Context (för Claude/GitHub Copilot)
Detta projekt är ett monorepo. Vid ändringar som rör datamodeller, se till att uppdatera både C#-klasserna i `Hyr.Api` och motsvarande API-anrop/logik i `Hyr.Web`.
