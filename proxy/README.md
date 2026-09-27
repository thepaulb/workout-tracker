# Shared Caddy proxy

One Caddy for every app on the box, run as its own compose project. Apps
join the external `web` network under a unique alias (`gym`, `bookmarker`)
and Caddy proxies to that alias.

| Site                    | Upstream          | App repo                  |
| ----------------------- | ----------------- | ------------------------- |
| `gym.theanvil.uk`       | `gym:3001`        | thepaulb/workout-tracker  |
| `bookmarks.theanvil.uk` | `bookmarker:3001` | thepaulb/bookmarker       |

## One-time cutover (from Caddy inside the gym compose project)

Run on the server as `deploy`. The gym site is down between steps 4 and 5
(about a minute).

```sh
# 1. Shared network
docker network create web

# 2. Confirm the old Caddy cert volume's name matches proxy/docker-compose.yml
docker volume ls | grep caddy        # expect workout-tracker_caddy-data

# 3. Check out this change
cd ~/workout-tracker
git fetch && git checkout deploy/shared-caddy

# 4. Recreate the app on the `web` network; --remove-orphans stops the old Caddy
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# 5. Start the shared proxy
cd proxy && docker compose up -d

# 6. Check
curl -I https://gym.theanvil.uk
docker compose logs caddy --tail 50
```

Then merge the PR and put the server back on `main` so CI's `git pull`
tracks it again:

```sh
cd ~/workout-tracker && git checkout main && git pull
```

## Adding or changing a site

Edit `Caddyfile`, pull it onto the server, then reload (no downtime):

```sh
cd ~/workout-tracker/proxy
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

App deploys don't touch Caddy, so a Caddyfile change only takes effect
after this reload.
