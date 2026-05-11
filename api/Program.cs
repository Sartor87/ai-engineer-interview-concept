using AIInterviewGuide.Functions;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication()
    .ConfigureServices(services =>
    {
        services.AddMemoryCache();
        services.AddSingleton<StihiaService>();
        services.AddHttpClient("nvidia", client =>
        {
            client.BaseAddress = new Uri("https://integrate.api.nvidia.com");
            client.Timeout = TimeSpan.FromSeconds(60);
        });
        services.AddHttpClient("stihia", client =>
        {
            client.BaseAddress = new Uri("https://api.stihia.ai");
            client.Timeout = TimeSpan.FromSeconds(10);
        });
    })
    .Build();

await host.RunAsync();
