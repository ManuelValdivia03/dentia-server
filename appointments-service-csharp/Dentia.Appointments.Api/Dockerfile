FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY Dentia.Appointments.Api.csproj ./
RUN dotnet restore

COPY . ./
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish ./

EXPOSE 3002

ENV ASPNETCORE_URLS=http://+:3002

ENTRYPOINT ["dotnet", "Dentia.Appointments.Api.dll"]