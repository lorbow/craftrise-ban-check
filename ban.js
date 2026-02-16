  async checkBanStatus(username) {
    const cacheKey = `ban_${username}`;
    const cached = this.banCache.get(cacheKey);
    
    // Cache kontrolü (5 dakika)
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.result;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.REQUEST_TIMEOUT);

      const res = await fetch(
        "https://www.craftrise.com.tr/posts/post-search.php",
        {
          method: "POST",
          headers: {
            "Accept": "*/*",
            "Accept-Language": "tr-TR,tr;q=0.6",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Origin": "https://www.craftrise.com.tr",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": "https://www.craftrise.com.tr/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          },
          body: new URLSearchParams({ username }),
          signal: controller.signal
        }
      );

      clearTimeout(timeout);

      if (!res.ok) {
        const result = { status: "error", emoji: "⚠️", text: "Kontrol edilemedi" };
        this.banCache.set(cacheKey, { result, timestamp: Date.now() });
        return result;
      }

      const json = await res.json();
      let result;

      // Debug: API response'unu logla
      this.logger.log(`Ban check - ${username}: resultType=${json.resultType}, message=${json.resultMessage}`, 'DEBUG');

      if (
        json.resultType === "error" &&
        typeof json.resultMessage === "string" &&
        json.resultMessage.toLowerCase().includes("engellen")
      ) {
        result = { status: "banned", emoji: "", text: "Banlı" };
      } else {
        result = { status: "clean", emoji: "", text: "Temiz" };
      }

      this.banCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;

    } catch (error) {
      this.logger.logError(error, `Ban check: ${username}`);
      const result = { status: "error", emoji: "⚠️", text: "API hatası" };
      this.banCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    }
  }
