using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MoneyTrack.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCategoryOrdering : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Remove all existing categories - seeder will repopulate with OrderIndex
            migrationBuilder.Sql("DELETE FROM category");

            migrationBuilder.AddColumn<int>(
                name: "order_index",
                table: "category",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "order_index",
                table: "category");
        }
    }
}
