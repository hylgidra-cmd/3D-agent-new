# LocalPage backend (.NET 10 minimal API). Render has no native .NET runtime,
# so this is deployed as a container.

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY LocalPageBackend.csproj ./
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_ENVIRONMENT=Production
COPY --from=build /app ./

# Render sets PORT at runtime; Program.cs binds to 0.0.0.0:$PORT when it's present.
ENTRYPOINT ["dotnet", "LocalPageBackend.dll"]
