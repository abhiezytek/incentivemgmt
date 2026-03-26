using Microsoft.AspNetCore.Mvc;
using IncentiveApi.Data;
using IncentiveApi.Models;

namespace IncentiveApi.Controllers;

[ApiController]
[Route("api/v1/derived-variables")]
[Route("api/derived-variables")]
public class DerivedVariablesController : ControllerBase
{
    private readonly QueryHelper _qh;

    public DerivedVariablesController(QueryHelper qh) => _qh = qh;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var rows = await _qh.FindAllAsync("derived_variables", orderBy: "created_at DESC");
        return Ok(ApiResponse<object>.Ok(rows));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Dictionary<string, object> body)
    {
        var row = await _qh.InsertRowAsync("derived_variables", body);
        return Created("", ApiResponse<object>.Ok(row));
    }
}
