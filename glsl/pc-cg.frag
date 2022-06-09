#version 300 es

precision highp float;

in vec3 v_position;
in vec2 v_texcoord;
in vec3 v_normal;

out vec4 color;

struct DirLight {
	vec3 direction;

	float diffuse;
	float specular;
	vec4 color;
};

struct SpotLight {
	vec3 position;
	vec3 direction;
	float cutOff;
	float outerCutOff;

	float diffuse;
	float specular;
	float intensity;
	vec4 color;

	float constant;
	float linear;
	float quadratic;
};

uniform vec3 diffuse;
uniform sampler2D diffuseMap;
uniform sampler2D specularMap;
uniform vec3 ambient;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;

uniform float u_ambientIntensity;
uniform vec4 u_ambientColor;

uniform vec4 u_diffuseColor;
uniform float u_lintensity;

uniform DirLight u_dirLight;
uniform SpotLight u_spotLight;
uniform SpotLight u_lampLight;

uniform vec3 u_viewPosition;

vec3 calcDirLight(DirLight light, vec3 normal, vec4 mapColor, vec4 mapSpec, vec3 viewDir) {
	vec3 lightDir = normalize(-light.direction);

	float diffuseFactor = max(dot(normal, lightDir), 0.0);
	vec3 diffuse = light.diffuse * diffuseFactor * (mapColor.rgb * light.color.rgb);

	vec3 reflectDir = reflect(-lightDir, normal);
	float specularFactor = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
	vec3 specular = specularFactor * light.specular * (mapSpec.rgb * light.color.rgb);

	return diffuse + specular;
}


vec3 calcSpotLight(SpotLight light, vec3 normal, vec4 mapColor, vec4 mapSpec, vec3 viewDir) {
	vec3 lightDir = normalize(light.position - v_position.xyz);

	float diffuseFactor = max(dot(normal, lightDir), 0.0);
	vec3 diffuse = light.diffuse * diffuseFactor * (mapColor.rgb * light.color.rgb);

	vec3 reflectDir = reflect(-lightDir, normal);
	float specularFactor = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
	vec3 specular = light.specular * specularFactor * (mapSpec.rgb * light.color.rgb);

	float distance = length(light.position - v_position.xyz);
	float attenuation = 1.0 / (light.constant + light.linear * distance + light.quadratic * (distance * distance));

	float theta = dot(lightDir, normalize(-light.direction));
	float epsilon = light.cutOff - light.outerCutOff;
	float intensity = clamp((theta - light.outerCutOff) / epsilon, 0.0, 1.0);
	diffuse *= attenuation * intensity;
	specular *= attenuation * intensity;

	return (diffuse + specular)*light.intensity;
}


void main() {
	vec3 normal = normalize(v_normal);
	vec4 mapColor = texture(diffuseMap, v_texcoord);
	vec4 mapSpec = texture(specularMap, v_texcoord);
	vec3 viewDir = normalize(u_viewPosition - v_position.xyz);

	//Ambient light
	vec3 result = u_ambientIntensity * (mapColor.rgb * u_ambientColor.rgb);

	//Dirlight
	result += calcDirLight(u_dirLight, normal, mapColor, mapSpec, viewDir);

	//Spotlights
	result += calcSpotLight(u_spotLight, normal, mapColor, mapSpec, viewDir);
	result += calcSpotLight(u_lampLight, normal, mapColor, mapSpec, viewDir);

	// color = vec4(result * ambient * diffuse, opacity);
	color = vec4(result * ambient * diffuse, opacity);
}
