# Turbobujias — Pre-Deployment Checklist

## Local Testing Checklist (BEFORE Pushing to HuggingFace Spaces)

### Step 1: Environment Setup

- [ ] `.env` file created from `.env.example`
- [ ] `.env` is in `.gitignore` (won't be committed)
- [ ] `.env` has at least ONE LLM provider configured:
  - [ ] `GITHUB_TOKEN=your_token` OR
  - [ ] `GEMINI_API_KEY=your_key` OR
  - [ ] `HF_TOKEN=your_token`
- [ ] `.env.example` has NO real credentials
- [ ] Local IP identified: **192.168.0.7** ✓
- [ ] Docker Desktop running and accessible

### Step 2: Start Local Services

```bash
# Start services
docker compose -f docker-compose.full-stack.yml up

# In another terminal, run tests
powershell scripts/local-test.ps1 test
```

- [ ] Build completes without errors
- [ ] Chatbot service starts (port 7860)
- [ ] Frontend service starts (port 3000)
- [ ] No port conflicts

### Step 3: Test on Localhost

- [ ] **Chatbot (Localhost):** http://localhost:7860
  - [ ] UI loads (Gradio interface)
  - [ ] Ask test question in Spanish or English
  - [ ] Receives response from inventory
  - [ ] No console errors (F12)

- [ ] **Frontend (Localhost):** http://localhost:3000
  - [ ] Next.js app loads
  - [ ] All pages accessible
  - [ ] Links to chatbot work
  - [ ] No 404 errors

### Step 4: Test on Local Network IP

From **this machine**:
- [ ] **Chatbot (Local IP):** http://192.168.0.7:7860
  - [ ] Same as localhost test
  - [ ] Response time acceptable (<5s)

- [ ] **Frontend (Local IP):** http://192.168.0.7:3000
  - [ ] Same as localhost test
  - [ ] CSS/JS loaded correctly

From **another device on same WiFi** (phone/tablet/other computer):
- [ ] Can reach http://192.168.0.7:7860
- [ ] Can reach http://192.168.0.7:3000
- [ ] Services responsive

### Step 5: Service Communication

- [ ] Frontend can reach chatbot API
  - [ ] Check browser DevTools → Network tab
  - [ ] No CORS errors
  - [ ] Requests to chatbot succeed

- [ ] Containers communicate on Docker network
  ```bash
  docker exec turbobujias-frontend curl http://chatbot:7860/health
  # Should return HTTP 200
  ```

### Step 6: Performance Testing

- [ ] Chatbot response time: <10 seconds
- [ ] Frontend page load: <3 seconds
- [ ] No memory leaks (check `docker stats`)
- [ ] CPU usage reasonable (<50% per service)

### Step 7: Error Handling

Test error scenarios:
- [ ] Chatbot with invalid question → Graceful error message
- [ ] Frontend with no backend → Shows error (or handles gracefully)
- [ ] Stop chatbot service → Frontend shows connection error
- [ ] Restart services → Everything reconnects

### Step 8: Logs Inspection

```bash
docker compose -f docker-compose.full-stack.yml logs
```

- [ ] No ERROR level messages
- [ ] No stack traces
- [ ] No connection refused errors
- [ ] Services initialize cleanly

---

## Git & Repository Checklist

- [ ] `.env` file is ignored:
  ```bash
  git status
  # Should NOT show .env file
  ```

- [ ] `.gitignore` includes `.env`:
  ```bash
  cat .gitignore | findstr "^.env$"
  # Should match
  ```

- [ ] No credentials in source code:
  ```bash
  git diff --cached
  # Review all changes before commit
  ```

- [ ] Dockerfile doesn't copy `.env`:
  ```bash
  cat Dockerfile.simple | findstr ".env"
  # Should NOT copy .env
  ```

- [ ] `.env.example` is committed (no real values):
  ```bash
  git add .env.example
  git commit -m "Add environment template"
  ```

---

## Docker Image Checklist

- [ ] Both images built successfully:
  ```bash
  docker images | findstr turbobujias
  # Should show frontend and chatbot images
  ```

- [ ] Image sizes reasonable:
  - [ ] Frontend: ~1.3-1.5 GB (includes Node.js)
  - [ ] Chatbot: ~3-3.2 GB (includes PyTorch)

- [ ] No dangling layers:
  ```bash
  docker system df
  # Check "UNUSED" section
  ```

---

## HuggingFace Spaces Preparation

- [ ] Collected all required secrets:
  - [ ] `GITHUB_TOKEN` (or `GEMINI_API_KEY` or `HF_TOKEN`)
  - [ ] `SUPABASE_URL` (optional, for Phase 2)
  - [ ] `SUPABASE_ANON_KEY` (optional, for Phase 2)

- [ ] Verified secret values work:
  ```bash
  # Test each in .env before pushing
  curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
  # Should return user info, not 401
  ```

- [ ] Ready to add to Space Settings:
  - [ ] HuggingFace account active
  - [ ] Space created and accessible
  - [ ] Secrets tab visible in Settings

---

## Final Deployment Readiness

- [ ] All local tests passing ✓
- [ ] No credentials in code ✓
- [ ] `.env.example` created ✓
- [ ] Docker images built ✓
- [ ] Services communicate ✓
- [ ] Performance acceptable ✓
- [ ] Git clean (no uncommitted .env) ✓
- [ ] HF Spaces secrets ready ✓

---

## Deployment Steps (After Checklist)

1. **Commit & push code (WITHOUT `.env`):**
   ```bash
   git add .
   git commit -m "Deploy full-stack chatbot + frontend"
   git push origin main
   ```

2. **Go to HuggingFace Space Settings:**
   - Click ⚙️ (Settings)
   - Find "Secrets" section
   - Add each secret one by one

3. **Space auto-deploys:**
   - Waits for you to add secrets
   - Builds Docker image
   - Starts services
   - Tests healthchecks

4. **Verify Space deployment:**
   - Visit Space URL
   - Test chatbot
   - Test frontend
   - Check logs

---

## Rollback / Emergency Contacts

- [ ] Know your Docker Desktop restart procedure
- [ ] Know how to stop containers: `docker compose down`
- [ ] Know how to clean up: `docker system prune -a`
- [ ] Have backup of `.env` (local only, never shared)

---

## Sign-Off

| Item | Owner | Date | Status |
|------|-------|------|--------|
| Local Testing | You | __ / __ / __ | [ ] |
| Code Review | You | __ / __ / __ | [ ] |
| Security Check | You | __ / __ / __ | [ ] |
| Ready to Deploy | You | __ / __ / __ | [ ] |

---

**Once all checks pass, you're ready to push to HuggingFace Spaces!** 🚀
