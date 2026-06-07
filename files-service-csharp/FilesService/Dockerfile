FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY FilesService.csproj ./
RUN dotnet restore

COPY . ./
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish ./

RUN mkdir -p /app/uploads && chown -R app:app /app/uploads

ENV Storage__Path=/app/uploads

EXPOSE 8080

USER app

ENTRYPOINT ["dotnet", "FilesService.dll"]