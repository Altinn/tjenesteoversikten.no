using System.Collections.Concurrent;
using Microsoft.Extensions.Caching.Memory;

namespace AltinnServiceCatalogue.Server.Services;

internal static class MemoryCacheExtensions
{
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> CacheLocks = new();

    /// <summary>
    /// Gets a cached value or creates it while ensuring that only one request per key
    /// calls the upstream service on a cold cache.
    /// </summary>
    public static async Task<T?> GetOrCreateCoalescedAsync<T>(
        this IMemoryCache cache,
        string cacheKey,
        TimeSpan duration,
        Func<CancellationToken, Task<T?>> factory,
        CancellationToken ct)
        where T : class
    {
        if (cache.TryGetValue(cacheKey, out T? cached) && cached is not null)
            return cached;

        var cacheLock = CacheLocks.GetOrAdd(cacheKey, static _ => new SemaphoreSlim(1, 1));
        await cacheLock.WaitAsync(ct);

        try
        {
            if (cache.TryGetValue(cacheKey, out cached) && cached is not null)
                return cached;

            var value = await factory(ct);
            if (value is not null)
                cache.Set(cacheKey, value, duration);

            return value;
        }
        finally
        {
            cacheLock.Release();
        }
    }
}
