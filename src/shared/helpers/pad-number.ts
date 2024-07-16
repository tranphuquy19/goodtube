// Pad a number with leading zeros
export function goodTube_helper_padNumber(num: number | string, size: number): string {
	num = num.toString();
	while (num.length < size) num = "0" + num;
	return num;
}
