using Incentive.Application.Features.OrgDomainMapping;

namespace Incentive.Application.Abstractions.Repositories;

public interface IOrgDomainMappingRepository
{
    Task<OrgDomainMappingResponse> GetMappingsAsync(string view);
}
