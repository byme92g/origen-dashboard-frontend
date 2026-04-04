# ── Stage 1: Build ────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# nuget.config primero para limpiar fallback folders de Windows
COPY nuget.config .
COPY OrigenDashboard.csproj .
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o /app/publish --no-restore

# ── Stage 2: Nginx para servir Blazor WASM ────────────────────────────────
FROM nginx:alpine AS runtime

# Copiar archivos publicados de Blazor
COPY --from=build /app/publish/wwwroot /usr/share/nginx/html

# Copiar configuración de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
